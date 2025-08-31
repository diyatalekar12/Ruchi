const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-config.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ruchi-4311d.firebaseio.com" // Replace with your actual Firestore database URL
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Test Route
app.get("/", (req, res) => {
    res.send("✅ Backend is running successfully!");
});

// Add New Order
app.post("/add-order", async (req, res) => {
    try {
        const {
            customerName,
            address,
            orderDate,
            quantity,
            flavorSize,
            costPerPiece,
            advancePayment
        } = req.body;

        if (!customerName || !address || !orderDate || !quantity || !flavorSize || !costPerPiece || advancePayment === undefined) {
            return res.status(400).json({ error: "All fields are required!" });
        }

        const qty = parseInt(quantity);
        const cost = parseFloat(costPerPiece);
        const advance = parseFloat(advancePayment);

        if (isNaN(qty) || isNaN(cost) || isNaN(advance)) {
            return res.status(400).json({ error: "Invalid numeric values!" });
        }

        const parsedDate = new Date(req.body.orderDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: "Invalid order date format!" });
        }

        const orderTimestamp = admin.firestore.Timestamp.fromDate(parsedDate);
        const createdAtTimestamp = admin.firestore.Timestamp.now();

        const totalPayment = qty * cost;
        const pendingAmount = totalPayment - advance;

        const orderRef = db.collection("orders").doc();
        await orderRef.set({
            customerName,
            address,
            orderDate: orderTimestamp,
            quantity: qty,
            flavorSize,
            costPerPiece: cost,
            totalPayment,
            advancePayment: advance,
            pendingAmount,
            createdAt: createdAtTimestamp
        });

        res.status(201).json({ message: "✅ Order added successfully!", totalPayment, pendingAmount });
    } catch (error) {
        console.error("❌ Error adding order:", error);
        res.status(500).json({ error: "Failed to add order." });
    }
});

// Fetch All Orders
app.get("/get-orders", async (req, res) => {
    try {
        const ordersSnapshot = await db.collection("orders").orderBy("createdAt", "desc").get();

        if (ordersSnapshot.empty) {
            return res.status(200).json({ message: "No orders found!", orders: [] });
        }

        const orders = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate().toISOString(),
            orderDate: doc.data().orderDate.toDate().toISOString()
        }));

        res.status(200).json(orders);
    } catch (error) {
        console.error("❌ Error fetching orders:", error);
        res.status(500).json({ error: "Failed to fetch orders." });
    }
});

// Mark Order as Delivered
app.post("/mark-order-done/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        const orderRef = db.collection("orders").doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return res.status(404).json({ error: "Order not found!" });
        }

        await orderRef.update({ isDelivered: true });

        res.status(200).json({ success: true, message: "✅ Order marked as delivered!" });
    } catch (error) {
        console.error("❌ Error marking order as delivered:", error);
        res.status(500).json({ error: "Failed to mark order as delivered." });
    }
});

// Delete Order
app.delete("/delete-order/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        await db.collection("orders").doc(orderId).delete();
        res.json({ message: "✅ Order deleted successfully!" });
    } catch (error) {
        console.error("❌ Error deleting order:", error);
        res.status(500).json({ error: "Failed to delete order." });
    }
});

// Firebase Cloud Functions export
exports.api = functions.https.onRequest(app);
