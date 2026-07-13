export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const cron = await import("node-cron");
  const { closeExpiredTrips } = await import("@/lib/trips");

  cron.schedule("* * * * *", async () => {
    try {
      await closeExpiredTrips();
    } catch (err) {
      console.error("[cron] closeExpiredTrips failed", err);
    }
  });
}
