// Copyright 2026 The Agent Desk Authors
// SPDX-License-Identifier: MIT

/**
 * Native notification prompting the user to grant folder-scan access after a
 * denial. Fires at most once per app launch (a stored TCC denial doesn't change
 * without an OS-settings round trip, so re-nagging mid-session is noise). The
 * OS-touching bits are injected so the once-per-launch guard is unit-testable
 * without the Electron Notification runtime.
 */

import { Notification } from "electron";
import { logger } from "../logging/logger";

export interface NotifierDeps {
  /** Whether the OS can show notifications (Notification.isSupported()). */
  isSupported: () => boolean;
  /** Show the notification; invoke the passed callback on click. */
  show: (onClick: () => void) => void;
}

// Electron delivers native events asynchronously, so the object must outlive show().
let permissionNotification: Notification | undefined;

const defaultDeps: NotifierDeps = {
  isSupported: () => Notification.isSupported(),
  show: (onClick) => {
    permissionNotification = new Notification({
      title: "Agent Desk needs folder access",
      body: "Grant access so Agent Desk can read the coding projects in your protected folders.",
      silent: false,
    });
    permissionNotification.on("click", onClick);
    // macOS reports a notification it will not show (an unsigned build, notifications turned
    // off) through this event, never by throwing from show().
    permissionNotification.on("failed", (_event, error) => {
      logger.warn("permissions", "notification_show_failed", { error });
    });
    permissionNotification.show();
  },
};

let notifiedThisLaunch = false;

/**
 * Show the "folder access missing" notification once per launch. `onClick` runs
 * when the user clicks it. Returns true iff a notification was shown this call.
 */
export function notifyPermissionMissing(
  onClick: () => void,
  deps: NotifierDeps = defaultDeps,
): boolean {
  if (notifiedThisLaunch) return false;
  if (!deps.isSupported()) return false;
  try {
    deps.show(onClick);
    notifiedThisLaunch = true;
  } catch (err: unknown) {
    logger.warn("permissions", "notification_show_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
  return true;
}

/** Test-only: reset the once-per-launch guard. Do NOT call from production. */
export function __resetNotifierForTests(): void {
  notifiedThisLaunch = false;
  permissionNotification = undefined;
}
