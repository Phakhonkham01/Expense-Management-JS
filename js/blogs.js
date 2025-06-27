// Ensure this file is linked with `defer` in HTML to run after DOM is ready
// For Bootstrap 5, we need to use its JavaScript API for modals.
// This typically involves creating a new Bootstrap Modal instance.

const auth = firebase.auth();
const db = firebase.firestore();

// Get references to HTML elements
const userEmailSpan = document.getElementById("user-email");
const loadingIndicator = document.getElementById("loading-indicator");
const expenseFormModalElement = document.getElementById("expenseFormModal");
const expenseFormModal = new bootstrap.Modal(expenseFormModalElement); // Bootstrap Modal instance
const expenseForm = document.getElementById("expense-form");
const expenseIdInput = document.getElementById("expense-id");
const descriptionInput = document.getElementById("description");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const amountInput = document.getElementById("amount");
const paymentMethodSelect = document.getElementById("payment-method");
const expenseTableBody = document.querySelector("#expense-table tbody");

const analysisModalElement = document.getElementById("analysisModal");
const analysisModal = new bootstrap.Modal(analysisModalElement); // Bootstrap Modal instance
const totalExpensesSpan = document.getElementById("total-expenses");
const expenseChartCanvas = document.getElementById("expense-chart");
const paymentMethodChartCanvas = document.getElementById(
  "payment-method-chart"
);

let currentUserId = null;
let categoryChart = null; // To hold the Chart.js instance for categories
let paymentMethodChart = null; // To hold the Chart.js instance for payment methods

// --- Authentication State Management ---
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserId = user.uid;
    userEmailSpan.textContent = user.email;
    console.log("User logged in:", user.email, user.uid);
    fetchExpenses(); // Load expenses when user is authenticated
  } else {
    console.log("No user logged in. Redirecting to login.");
    // Redirect to your login page. Adjust path if necessary.
    window.location.href = "./login.html"; // Assuming login page is login.html
  }
});

// --- Logout Function ---
window.logout = function () {
  auth
    .signOut()
    .then(() => {
      console.log("User logged out.");
      window.location.href = "./login.html"; // Redirect to login page after logout
    })
    .catch((error) => {
      console.error("Error signing out:", error);
      alert("Failed to log out. Please try again.");
    });
};

// --- Show/Hide Loading Indicator ---
function showLoading() {
  loadingIndicator.classList.remove("d-none");
}

function hideLoading() {
  loadingIndicator.classList.add("d-none");
}

// --- Expense Form Modal Functions ---
window.showExpenseForm = function (expense = null) {
  // Reset form for new entry or populate for edit
  expenseForm.reset();
  expenseIdInput.value = ""; // Clear ID for new expense

  if (expense) {
    document.getElementById("expenseFormModalLabel").textContent =
      "Edit Expense";
    expenseIdInput.value = expense.id;
    descriptionInput.value = expense.description;
    categorySelect.value = expense.category;
    dateInput.value = expense.date;
    amountInput.value = expense.amount;
    paymentMethodSelect.value = expense.paymentMethod;
  } else {
    document.getElementById("expenseFormModalLabel").textContent =
      "Register Expense";
    // Set today's date as default for new expense
    dateInput.valueAsDate = new Date();
  }
  expenseFormModal.show(); // Show Bootstrap modal
};

// Close button functionality handled by Bootstrap's data-bs-dismiss="modal"

// --- Handle Expense Form Submission ---
expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const expenseId = expenseIdInput.value;
  const description = descriptionInput.value;
  const category = categorySelect.value;
  const date = dateInput.value;
  const amount = parseFloat(amountInput.value);
  const paymentMethod = paymentMethodSelect.value;

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid positive amount.");
    return;
  }

  const expenseData = {
    userId: currentUserId,
    description,
    category,
    date,
    amount,
    paymentMethod,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Timestamp for sorting
  };

  try {
    showLoading();
    if (expenseId) {
      // Update existing expense
      await db.collection("expenses").doc(expenseId).update(expenseData);
      alert("Expense updated successfully!");
    } else {
      // Add new expense
      await db.collection("expenses").add(expenseData);
      alert("Expense added successfully!");
    }
    expenseFormModal.hide(); // Hide Bootstrap modal
    fetchExpenses(); // Refresh the table
  } catch (error) {
    console.error("Error saving expense:", error);
    alert("Failed to save expense. Please try again.");
  } finally {
    hideLoading();
  }
});

// --- Fetch & Display Expenses ---
async function fetchExpenses() {
  if (!currentUserId) {
    console.warn("No user ID available to fetch expenses.");
    return;
  }

  showLoading();
  expenseTableBody.innerHTML = ""; // Clear existing table rows

  try {
    const querySnapshot = await db
      .collection("expenses")
      .where("userId", "==", currentUserId)
      .orderBy("date", "desc") // Order by date descending
      .get();

    querySnapshot.forEach((doc) => {
      const expense = { id: doc.id, ...doc.data() };
      const row = expenseTableBody.insertRow();
      row.innerHTML = `
                <td>${expense.description}</td>
                <td>${expense.category}</td>
                <td>${expense.date}</td>
                <td>${expense.amount.toFixed(2)} €</td>
                <td>${expense.paymentMethod}</td>
                <td>
                    <button class="btn btn-sm btn-info me-1" onclick="showExpenseForm(${JSON.stringify(
                      expense
                    ).replace(/"/g, "&quot;")})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteExpense('${
                      expense.id
                    }')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
    });

    if (querySnapshot.empty) {
      const noDataRow = expenseTableBody.insertRow();
      noDataRow.innerHTML = `<td colspan="6" class="text-center text-muted">No expenses recorded yet.</td>`;
    }
  } catch (error) {
    console.error("Error fetching expenses:", error);
    alert("Failed to load expenses.");
  } finally {
    hideLoading();
  }
}

// --- Delete Expense ---
window.deleteExpense = async function (id) {
  if (!confirm("Are you sure you want to delete this expense?")) {
    return;
  }
  try {
    showLoading();
    await db.collection("expenses").doc(id).delete();
    alert("Expense deleted successfully!");
    fetchExpenses(); // Refresh the table
  } catch (error) {
    console.error("Error deleting expense:", error);
    alert("Failed to delete expense. Please try again.");
  } finally {
    hideLoading();
  }
};

// --- Analysis Modal Functions ---
window.showAnalysisModal = async function () {
  if (!currentUserId) {
    alert("Please log in to view analysis.");
    return;
  }
  showLoading();
  try {
    const querySnapshot = await db
      .collection("expenses")
      .where("userId", "==", currentUserId)
      .get();

    let total = 0;
    const categoryData = {};
    const paymentMethodData = {};

    querySnapshot.forEach((doc) => {
      const expense = doc.data();
      total += expense.amount;

      // Aggregate by category
      categoryData[expense.category] =
        (categoryData[expense.category] || 0) + expense.amount;

      // Aggregate by payment method
      paymentMethodData[expense.paymentMethod] =
        (paymentMethodData[expense.paymentMethod] || 0) + expense.amount;
    });

    totalExpensesSpan.textContent = `${total.toFixed(2)} €`;

    // Render Category Chart
    if (categoryChart) categoryChart.destroy(); // Destroy previous chart instance
    categoryChart = new Chart(expenseChartCanvas, {
      type: "pie",
      data: {
        labels: Object.keys(categoryData),
        datasets: [
          {
            data: Object.values(categoryData),
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "#FF9F40",
              "#E7E9ED",
              "#C9CBCE",
              "#A1CA39",
              "#5B7C99",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#333", // Darker label color for light background
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed !== null) {
                  label += context.parsed.toFixed(2) + " €";
                }
                return label;
              },
            },
          },
        },
      },
    });

    // Render Payment Method Chart
    if (paymentMethodChart) paymentMethodChart.destroy(); // Destroy previous chart instance
    paymentMethodChart = new Chart(paymentMethodChartCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(paymentMethodData),
        datasets: [
          {
            label: "Amount (€)",
            data: Object.values(paymentMethodData),
            backgroundColor: [
              "rgba(255, 99, 132, 0.6)",
              "rgba(54, 162, 235, 0.6)",
              "rgba(255, 206, 86, 0.6)",
              "rgba(75, 192, 192, 0.6)",
              "rgba(153, 102, 255, 0.6)",
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 206, 86, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(153, 102, 255, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "#333",
            },
          },
          x: {
            ticks: {
              color: "#333",
            },
          },
        },
        plugins: {
          legend: {
            display: false, // Hide legend for single dataset
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(2) + " €";
                }
                return label;
              },
            },
          },
        },
      },
    });

    analysisModal.show(); // Show Bootstrap modal
  } catch (error) {
    console.error("Error generating analysis:", error);
    alert("Failed to generate analysis. Please try again.");
  } finally {
    hideLoading();
  }
};

// Close button functionality handled by Bootstrap's data-bs-dismiss="modal"

// Helper to convert date to YYYY-MM-DD for input[type="date"]
function formatDateForInput(isoDateString) {
  if (!isoDateString) return "";
  const date = new Date(isoDateString);
  return date.toISOString().split("T")[0];
}

// Initial fetch of expenses (will be called by onAuthStateChanged)
// Don't call fetchExpenses() directly here, as it needs currentUserId from auth.onAuthStateChanged
