// Copyright 2026 The Agent Desk Authors
// SPDX-License-Identifier: MIT

// The default notifier against a stand-in Electron Notification. macOS reports a notification it
// will not show through the "failed" event, never by throwing from show(), so the notifier logs it.

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { queryObjects } from "node:v8";

// Keep only weak references: a strong fixture reference would hide premature collection.
const shown: WeakRef<FakeNotification>[] = [];
class FakeNotification extends EventEmitter {
  static isSupported = () => true;
  show() {
    shown.push(new WeakRef(this));
  }
}
const warnings: unknown[][] = [];
mock.module("electron", { namedExports: { Notification: FakeNotification } });
mock.module("../../logging/logger", {
  namedExports: { logger: { warn: (...args: unknown[]) => warnings.push(args) } },
});
const { notifyPermissionMissing } = await import("../permissionNotifier");

test("the notification survives until its asynchronous failure and click events", async () => {
  let clicked = false;
  assert.equal(notifyPermissionMissing(() => { clicked = true; }), true);
  assert.equal(shown.length, 1);
  // WeakRefs keep their target alive within the current turn; collect in the next turn.
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(queryObjects(FakeNotification), 1, "the notifier must retain the native notification");
  const notification = shown[0]!.deref()!;
  notification.emit("failed", {}, "Notifications are not allowed for this application");
  assert.deepEqual(warnings, [
    ["permissions", "notification_show_failed", { error: "Notifications are not allowed for this application" }],
  ]);
  notification.emit("click");
  assert.equal(clicked, true);
});
