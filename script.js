firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loadExpenses(user.uid);
    document.getElementById("user-email").textContent = user.email;
  } else {
    window.location = "index.html";
  }
});

let expenseChart = null;
let paymentMethodChart = null;

function loadExpenses(uid) {
  document.getElementById("loading-indicator").style.display = "block";

  db.collection("expenseDetails")
    .where("userID", "==", uid)
    .get()
    .then((snapshot) => {
      const expenseTableBody = document
        .getElementById("expense-table")
        .getElementsByTagName("tbody")[0];
      expenseTableBody.innerHTML = "";

      let totalAmount = 0;
      const categoryAmounts = {};
      const paymentMethodCounts = {};

      snapshot.forEach((doc) => {
        const expense = doc.data();
        const row = expenseTableBody.insertRow();

        // แสดงข้อมูลแต่ละฟิลด์
        row.insertCell(0).textContent = expense.expenseTextDetails;
        row.insertCell(1).textContent = expense.selectedValue;
        row.insertCell(2).textContent = expense.CreatedAt;

        const amountCell = row.insertCell(3);
        const amount = parseFloat(expense.expensePrice).toFixed(2);
        amountCell.textContent = `${amount} KIP`;

        totalAmount += parseFloat(amount);

        if (categoryAmounts[expense.selectedValue]) {
          categoryAmounts[expense.selectedValue] += parseFloat(amount);
        } else {
          categoryAmounts[expense.selectedValue] = parseFloat(amount);
        }

        if (paymentMethodCounts[expense.paymentMethod]) {
          paymentMethodCounts[expense.paymentMethod] += 1;
        } else {
          paymentMethodCounts[expense.paymentMethod] = 1;
        }

        row.insertCell(4).textContent = expense.paymentMethod;

        const actionsCell = row.insertCell(5);
        const editButton = document.createElement("button");
      
        editButton.addEventListener("click", () => editExpense(doc.id));

        const deleteButton = document.createElement("button");
        
        deleteButton.addEventListener("click", () => deleteExpense(doc.id));

        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
      });

      updateCategoryChart(categoryAmounts);
      updatePaymentMethodChart(paymentMethodCounts);
      document.getElementById(
        "total-expenses"
      ).textContent = `${totalAmount.toFixed(2)} KIP`;

      document.getElementById("loading-indicator").style.display = "none";
    })
    .catch((error) => {
      console.error("Error loading expenses:", error);
      document.getElementById("loading-indicator").style.display = "none";
    });
}

function updatePaymentMethodChart(paymentMethodCounts) {
  const ctx = document.getElementById("payment-method-chart").getContext("2d");
  if (paymentMethodChart) {
    paymentMethodChart.destroy();
  }

  paymentMethodChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(paymentMethodCounts),
      datasets: [
        {
          data: Object.values(paymentMethodCounts),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
          ],
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
}

function updateCategoryChart(categoryAmounts) {
  const ctx = document.getElementById("expense-chart").getContext("2d");
  if (expenseChart) {
    expenseChart.destroy();
  }

  expenseChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryAmounts),
      datasets: [
        {
          data: Object.values(categoryAmounts),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
          ],
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
}

// ✅ เพิ่มหรืออัปเดตข้อมูล
document.getElementById("expense-form").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("loading-indicator").style.display = "block";

  const user = firebase.auth().currentUser;
  const expenseId = document.getElementById("expense-id").value;

  const expenseData = {
    userID: user.uid,
    expenseTextDetails: document.getElementById("description").value,
    selectedValue: document.getElementById("category").value,
    CreatedAt: document.getElementById("date").value,
    expensePrice: document.getElementById("amount").value,
    paymentMethod: document.getElementById("payment-method").value,
  };

  const saveAction = expenseId
    ? db.collection("expenseDetails").doc(expenseId).update(expenseData)
    : db.collection("expenseDetails").add(expenseData);

  saveAction
    .then(() => {
      closeExpenseForm();
      loadExpenses(user.uid);
    })
    .catch((error) => {
      console.error("Error saving expense:", error);
    })
    .finally(() => {
      document.getElementById("loading-indicator").style.display = "none";
    });
});

function editExpense(id) {
  document.getElementById("loading-indicator").style.display = "block";
  db.collection("expenseDetails")
    .doc(id)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const expense = doc.data();
        document.getElementById("expense-id").value = id;
        document.getElementById("description").value =
          expense.expenseTextDetails;
        document.getElementById("category").value = expense.selectedValue;
        document.getElementById("date").value = expense.CreatedAt;
        document.getElementById("amount").value = expense.expensePrice;
        document.getElementById("payment-method").value = expense.paymentMethod;
        showExpenseForm();
      }
    })
    .catch((error) => {
      console.error("Error editing expense:", error);
    })
    .finally(() => {
      document.getElementById("loading-indicator").style.display = "none";
    });
}

function deleteExpense(id) {
  const user = firebase.auth().currentUser;
  document.getElementById("loading-indicator").style.display = "block";
  db.collection("expenseDetails")
    .doc(id)
    .delete()
    .then(() => {
      loadExpenses(user.uid);
    })
    .catch((error) => {
      console.error("Error deleting expense:", error);
    })
    .finally(() => {
      document.getElementById("loading-indicator").style.display = "none";
    });
}

function showExpenseForm() {
  document.getElementById("expense-form-container").style.display = "block";
}

function closeExpenseForm() {
  document.getElementById("expense-form-container").style.display = "none";
  document.getElementById("expense-form").reset();
  document.getElementById("expense-id").value = "";
}

function showAnalysisModal() {
  document.getElementById("analysis-modal").style.display = "block";
}

function closeAnalysisModal() {
  document.getElementById("analysis-modal").style.display = "none";
}

function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => {
      window.location = "index.html";
    });
}
