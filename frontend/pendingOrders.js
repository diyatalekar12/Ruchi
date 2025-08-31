import { db, collection, query, where, getDocs, doc, updateDoc } from "./firebase-config.js";

// Save orders to IndexedDB for offline access
function saveOrdersToIndexedDB(orders) {
    if (!("indexedDB" in window)) return;

    let request = indexedDB.open("RuchiIcecreamDB", 1);

    request.onupgradeneeded = function (event) {
        let db = event.target.result;
        if (!db.objectStoreNames.contains("pendingOrders")) {
            db.createObjectStore("pendingOrders", { keyPath: "id" });
        }
    };

    request.onsuccess = function (event) {
        let db = event.target.result;
        let transaction = db.transaction("pendingOrders", "readwrite");
        let store = transaction.objectStore("pendingOrders");
        orders.forEach((order) => store.put(order));
    };
}

// Load orders from IndexedDB when offline
function loadOrdersFromIndexedDB() {
    return new Promise((resolve) => {
        let request = indexedDB.open("RuchiIcecreamDB", 1);

        request.onsuccess = function (event) {
            let db = event.target.result;
            let transaction = db.transaction("pendingOrders", "readonly");
            let store = transaction.objectStore("pendingOrders");
            let getAll = store.getAll();

            getAll.onsuccess = function () {
                resolve(getAll.result);
            };
        };
    });
}

// Fetch and display pending orders
async function fetchPendingOrders() {
    const ordersContainer = document.getElementById("pendingOrdersContainer");
    ordersContainer.innerHTML = ""; // Clear previous data

    try {
        console.log("Fetching pending orders...");

        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("pendingAmount", ">", 0));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("No pending orders found.");
            ordersContainer.innerHTML = "<p style='color: white;'>No pending orders available.</p>";
            return;
        }

        let orders = [];
        querySnapshot.forEach((docSnap) => {
            const orderData = docSnap.data();
            const orderId = docSnap.id;

            const order = {
                id: orderId,
                customerName: orderData.customerName,
                address: orderData.address,
                orderDate: orderData.orderDate ? formatDate(orderData.orderDate.seconds * 1000) : "N/A",
                quantity: Number(orderData.quantity),
                flavorSize: orderData.flavorSize,
                costPerPiece: Number(orderData.costPerPiece),
                totalPayment: Number(orderData.totalPayment),
                advancePayment: Number(orderData.advancePayment),
                pendingAmount: Number(orderData.pendingAmount),
            };

            orders.push(order);
        });

        // Save orders to IndexedDB for offline access
        saveOrdersToIndexedDB(orders);
        displayOrders(orders);

    } catch (error) {
        console.error("Error fetching pending orders. Loading offline data...", error);

        // Load from IndexedDB if offline
        loadOrdersFromIndexedDB().then((orders) => {
            if (orders.length > 0) {
                displayOrders(orders);
            } else {
                ordersContainer.innerHTML = "<p style='color: white;'>No orders available offline.</p>";
            }
        });
    }
}

// Display orders in the UI
function displayOrders(orders) {
    const ordersContainer = document.getElementById("pendingOrdersContainer");
    ordersContainer.innerHTML = "";

    let ordersHTML = "";
    orders.forEach((order) => {
        ordersHTML += `
            <div class="order-card" data-id="${order.id}">
                <h3>${order.customerName}</h3>
                <p><strong>Address:</strong> ${order.address}</p>
                <p><strong>Order Date:</strong> ${order.orderDate}</p>
                <p><strong>Quantity:</strong> ${order.quantity}</p>
                <p><strong>Flavor & Size:</strong> ${order.flavorSize}</p>
                <p><strong>Cost per Piece:</strong> ₹${order.costPerPiece.toFixed(2)}</p>
                <p><strong>Total Payment:</strong> ₹${order.totalPayment.toFixed(2)}</p>
                <p><strong>Advance Payment:</strong> ₹${order.advancePayment.toFixed(2)}</p>
                <p class="pending-amount">
                    <strong>Pending Amount:</strong> 
                    ₹<span class="amount-text">${order.pendingAmount.toFixed(2)}</span>
                    <span class="edit-icon" data-id="${order.id}">✏️</span>
                </p>
            </div>
        `;
    });

    ordersContainer.innerHTML = ordersHTML;

    // Add event listeners for editing
    document.querySelectorAll(".edit-icon").forEach((icon) => {
        icon.addEventListener("click", handleEditPendingAmount);
    });
}

// Update pending amount in Firestore and IndexedDB
async function updatePendingAmount(orderId, newAmount) {
    const orderRef = doc(db, "orders", orderId);

    try {
        await updateDoc(orderRef, { pendingAmount: newAmount });
        console.log(`Updated pending amount for ${orderId}: ₹${newAmount}`);

        // Update IndexedDB
        let request = indexedDB.open("RuchiIcecreamDB", 1);
        request.onsuccess = function (event) {
            let db = event.target.result;
            let transaction = db.transaction("pendingOrders", "readwrite");
            let store = transaction.objectStore("pendingOrders");
            store.get(orderId).onsuccess = function (event) {
                let order = event.target.result;
                if (order) {
                    order.pendingAmount = newAmount;
                    store.put(order);
                }
            };
        };

        // Remove from UI if pending amount is 0
        if (newAmount === 0) {
            document.querySelector(`.order-card[data-id='${orderId}']`).remove();
        }
    } catch (error) {
        console.error("Error updating pending amount: ", error);
    }
}

// Handle editing pending amount
function handleEditPendingAmount(event) {
    const orderId = event.target.getAttribute("data-id");
    const parentElement = event.target.closest(".pending-amount");
    const amountText = parentElement.querySelector(".amount-text");

    const currentAmount = parseFloat(amountText.textContent);
    const inputField = document.createElement("input");
    inputField.type = "number";
    inputField.value = currentAmount.toFixed(2);
    inputField.style.width = "80px";
    inputField.style.fontSize = "14px";
    inputField.style.padding = "2px";
    inputField.style.marginLeft = "5px";

    parentElement.replaceChild(inputField, amountText);
    inputField.focus();

    inputField.addEventListener("blur", () => saveUpdatedAmount(orderId, inputField, parentElement));
    inputField.addEventListener("keypress", (event) => {
        if (event.key === "Enter") saveUpdatedAmount(orderId, inputField, parentElement);
    });
}

// Save updated pending amount
async function saveUpdatedAmount(orderId, inputField, parentElement) {
    const newAmount = parseFloat(inputField.value) || 0;
    const amountText = document.createElement("span");
    amountText.classList.add("amount-text");
    amountText.textContent = newAmount.toFixed(2);

    parentElement.replaceChild(amountText, inputField);

    if (!isNaN(newAmount)) {
        await updatePendingAmount(orderId, newAmount);
    }
}

// Utility function to format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-GB"); // Formats as DD/MM/YYYY
}

// Load pending orders when the page loads
fetchPendingOrders();
