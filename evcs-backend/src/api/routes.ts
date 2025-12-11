import { Router, Request, Response } from "express";
import { db } from "../services/db";
import { sendPushNotification, registerDeviceToken } from "../services/notifications";
import {
  getAllChargePoints,
  getChargePointById,
  getTransactionsByChargePoint,
  getAllTransactions,
  getAllUsers,
  getUserByTag,
} from "../services/steve";
import { getPollingStatus } from "../services/sync";

const router = Router();

// ============ Health & Status ============

// Health check
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Polling status
router.get("/polling/status", (req: Request, res: Response) => {
  res.json(getPollingStatus());
});

// ============ Charge Points (from Steve) ============

// Get all charge points from Steve
router.get("/charge-points", async (req: Request, res: Response) => {
  try {
    const chargePoints = await getAllChargePoints();
    res.json({
      total: chargePoints.length,
      data: chargePoints,
    });
  } catch (error) {
    console.error("Error fetching charge points:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific charge point from Steve
router.get("/charge-points/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const chargePoint = await getChargePointById(id);
    
    if (!chargePoint) {
      return res.status(404).json({ error: "Charge point not found" });
    }
    
    res.json(chargePoint);
  } catch (error) {
    console.error("Error fetching charge point:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ Transactions (from Steve) ============

// Get all transactions from Steve
router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const transactions = await getAllTransactions(limit);
    res.json({
      total: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get transactions for specific charge point from Steve
router.get("/charge-points/:cpId/transactions", async (req: Request, res: Response) => {
  try {
    const { cpId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const transactions = await getTransactionsByChargePoint(cpId, limit);
    
    res.json({
      chargePointId: cpId,
      total: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ Users (from Steve) ============

// Get all users from Steve
router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({
      total: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific user from Steve
router.get("/users/:idTag", async (req: Request, res: Response) => {
  try {
    const { idTag } = req.params;
    const user = await getUserByTag(idTag);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ Notifications ============

// Register device token for push notifications
router.post("/notifications/register-token", async (req: Request, res: Response) => {
  try {
    const { userId, token, deviceName } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        error: "Missing required fields: userId, token",
      });
    }

    const result = await registerDeviceToken({ userId, token, deviceName });

    if (result.success) {
      res.status(201).json({
        message: "Token registered successfully",
        action: result.action,
      });
    } else {
      res.status(500).json({
        error: result.error || "Failed to register token",
      });
    }
  } catch (error) {
    console.error("Error registering token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send test notification
router.post("/notifications/send", async (req: Request, res: Response) => {
  try {
    const { title, body, token } = req.body;

    if (!title || !body || !token) {
      return res.status(400).json({
        error: "Missing required fields: title, body, token",
      });
    }

    const result = await sendPushNotification({ title, body, token });

    if (result.success) {
      res.json({
        message: "Notification sent successfully",
        details: result.details,
      });
    } else {
      res.status(500).json({
        error: result.error,
        details: result.details,
      });
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ Notification Logs (Local DB) ============

// Get notification logs
router.get("/notifications/logs", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const [logs] = await db.query(
      `SELECT * FROM notifications_log ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    res.json({
      total: (logs as any[]).length,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching notification logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get notification logs for user
router.get("/notifications/logs/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const [logs] = await db.query(
      `SELECT nl.* FROM notifications_log nl
       JOIN device_tokens dt ON nl.device_token_id = dt.id
       WHERE dt.user_id = ?
       ORDER BY nl.created_at DESC LIMIT ?`,
      [userId, limit]
    );

    res.json({
      userId,
      total: (logs as any[]).length,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching notification logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ Transaction Events (Local DB) ============

// Get transaction events
router.get("/events/transactions", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const [events] = await db.query(
      `SELECT * FROM transaction_events ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    res.json({
      total: (events as any[]).length,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching transaction events:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
