import webpush from "web-push";
import { deletePushSubscription, listPushSubscriptionsForUser, type PushSub } from "@/lib/queries";

// Shared Web Push sending. Configures VAPID lazily and prunes dead endpoints.

let configured = false;
function configureVapid(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:noreply@example.com", pub, priv);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToSubscriptions(subs: PushSub[], payload: PushPayload) {
  if (!configureVapid()) return { sent: 0, removed: 0, skipped: "no_vapid" as const };
  const data = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url || "/" });
  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await deletePushSubscription(s.endpoint);
        removed++;
      }
    }
  }
  return { sent, removed };
}

// Send a push to all of a user's subscribed devices.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await listPushSubscriptionsForUser(userId);
  if (subs.length === 0) return { sent: 0, removed: 0 };
  return sendPushToSubscriptions(subs, payload);
}
