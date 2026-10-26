// Copyright 2026 The Agent Desk Authors
// SPDX-License-Identifier: MIT

import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerZIP } from "@electron-forge/maker-zip";
import path from "node:path";
import { existsSync } from "node:fs";

// Code signing: only active when ENABLE_CODE_SIGNING is set to anything but 0,
// false or no, and a "Developer ID Application" identity is in the keychain.
// Without it the finished bundle is signed ad hoc (scripts/adHocSign.cjs): no
// Developer ID, but a valid signature, which macOS needs to ask for folder access.
const canSign = !/^(|0|false|no)$/i.test(process.env.ENABLE_CODE_SIGNING ?? "");

// The electron package has no install script. Requiring it downloads the binary into
// node_modules/electron/dist when missing, so LICENSES.chromium.html (an extraResource below)
// exists even on a fresh install.
require("electron");

const appName = "Agent Desk";
const bundleId = "dev.agentdesk.app";

const config: ForgeConfig = {
  packagerConfig: {
    name: appName,
    executableName: "agent-desk",
    appBundleId: bundleId,
    appCopyright: "Copyright © 2026 The Agent Desk Authors",
    icon: path.resolve(__dirname, "resources/icon"),
    appCategoryType: "public.app-category.utilities",
    extendInfo: {
      // Launch as a background agent (no Dock icon, no top menu bar). This is the
      // startup state only — index.ts promotes to a regular app (Dock + menu bar)
      // while the window is visible and demotes back to accessory on hide-to-tray.
      LSUIElement: true,
      // Shown in the native TCC prompt for each folder (see PROTECTED_FOLDERS).
      NSDesktopFolderUsageDescription:
        "Agent Desk reads coding projects on your Desktop to show your AI coding sessions and harness files. It never changes them.",
      NSDocumentsFolderUsageDescription:
        "Agent Desk reads coding projects in your Documents folder to show your AI coding sessions and harness files. It never changes them.",
      NSDownloadsFolderUsageDescription:
        "Agent Desk reads coding projects in your Downloads folder to show your AI coding sessions and harness files. It never changes them.",
    },
    // The tray icons, plus every licence and notice text the build must carry
    // (NOTICE lists them; scripts/third-party-licenses.mjs keeps the folder in step).
    extraResource: [
      "resources",
      "LICENSE",
      "NOTICE",
      "third_party",
      path.resolve(__dirname, "node_modules/electron/dist/LICENSES.chromium.html"),
    ],
    // The app loads only from its asar archive (the OnlyLoadAppFromAsar fuse below).
    asar: true,
    afterCopy: [
      // Fail the build if the macOS app icon regressed. icon.icns is a binary invisible in a
      // diff, so a bad export can silently reintroduce the white-border or oversized bug that
      // code review cannot catch — see scripts/verifyIcon.cjs for the invariants asserted, and
      // resources/scripts/gen-icon.py for the only sanctioned way to regenerate the asset.
      (
        _buildPath: string,
        _electronVersion: string,
        _platform: string,
        _arch: string,
        callback: (err?: Error | null) => void,
      ) => {
        // Load the guard first, so a missing/broken tool is reported as tooling — not
        // misattributed as an icon regression by the assertIconValid catch below.
        let assertIconValid: (p: string) => void;
        try {
          ({ assertIconValid } = require(path.resolve(__dirname, "scripts/verifyIcon.cjs")));
        } catch (err) {
          callback(new Error(`[Forge] icon guard failed to load: ${(err as Error).message}`));
          return;
        }
        try {
          assertIconValid(path.resolve(__dirname, "resources/icon.icns"));
          console.log("[Forge] App icon validated: transparent corners + keyline margin");
          callback();
        } catch (err) {
          callback(err as Error);
        }
      },
      (
        buildPath: string,
        _electronVersion: string,
        _platform: string,
        _arch: string,
        callback: (err?: Error | null) => void,
      ) => {
        // Validate that the extraction utility-process bundle landed where
        // workerHost.spawn() expects it. Forge's Vite plugin determines the
        // output filename from the entry's basename — if it ever changes that
        // contract (or if a future entry rename collides), the worker would
        // silently fail to spawn at runtime. Fail the build here instead.
        const workerBundle = path.join(buildPath, ".vite", "build", "extractionWorker.js");
        if (!existsSync(workerBundle)) {
          callback(new Error(
            `[Forge] FATAL: extraction worker bundle missing at ${workerBundle}. ` +
            "Check forge.config.ts VitePlugin.build entries and vite.worker.config.ts. " +
            "WorkerHost.spawn() expects this filename — see src/main/extraction/workerHost.ts."
          ));
          return;
        }
        console.log(`[Forge] Extraction worker bundle validated: ${workerBundle}`);
        callback();
      },
    ],
    ...(canSign && {
      osxSign: {
        identity: "Developer ID Application",
        optionsForFile: (filePath: string) => {
          if (filePath.endsWith(".node") || filePath.endsWith(".dylib")) {
            return { hardenedRuntime: true };
          }
          return {
            entitlements: path.resolve(__dirname, "entitlements.mac.plist"),
            hardenedRuntime: true,
          };
        },
      },
    }),
  },
  makers: [new MakerDMG({ format: "ULFO" }), new MakerZIP({}, ["darwin"])],
  hooks: {
    // After the packager has written Info.plist and the fuses are flipped, so the signature
    // covers the final bundle.
    postPackage: async (_config, { outputPaths, platform }) => {
      if (canSign || platform !== "darwin") return;
      const { adHocSign } = require(path.resolve(__dirname, "scripts/adHocSign.cjs"));
      for (const out of outputPaths) adHocSign(path.join(out, `${appName}.app`), bundleId);
      console.log("[Forge] Signed ad hoc and verified");
    },
    // The .app inside each DMG and ZIP must verify too, signed ad hoc or with a Developer ID.
    postMake: async (_config, results) => {
      const { verifyMakeResults } = require(path.resolve(__dirname, "scripts/adHocSign.cjs"));
      const verified = verifyMakeResults(results, appName, bundleId);
      console.log(`[Forge] The DMG and ZIP hold a verified app (${verified} checked)`);
      return results;
    },
  },
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload/index.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
        {
          entry: "src/main/extraction/worker/extractionWorker.ts",
          config: "vite.worker.config.ts",
          target: "main",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Fuse 8, WasmTrapHandlers (Electron 41), stays at Electron's default, on: plugin-fuses 7
    // cannot name it. test/acceptance pins all nine fuses of the packaged app.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: true,
    }),
  ],
};

export default config;
