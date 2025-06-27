// ✅ Check if a user is authenticated
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // ✅ Load categories
    firebase
      .firestore()
      .collection("categories")
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          if (doc.data().userID === user.uid) {
            const select = document.getElementById("category-select");
            const option = document.createElement("option");
            option.textContent = doc.data().categoryName;
            select.appendChild(option);
          }
        });
      })
      .catch((error) => console.log(error));

    // ✅ Save expense
    getExpenseDetails = (event) => {
      event.preventDefault();
      document.getElementById("btn-load").style.display = "none";
      const paymentMethod = document.getElementById("payment-method").value;

      const selectedValue = document.getElementById("category-select").value;
      const expenseTextDetails =
        document.getElementById("ExpenseTextDetails").value;
      const expensePrice = document.getElementById("expensePrice").value;
      const selectedDate = document.getElementById("date").value; // 📅 from input type="date"
      if (!selectedValue || !expensePrice || !selectedDate) {
        document.getElementById("show-message").innerHTML =
          "ປ້ອນຂໍ້ມູນໃຫ້ຄົບ .";
        document.getElementById("show-message").style.color = "red";
        document.getElementById("btn-load").style.display = "block";
        return;
      }
      firebase
        .firestore()
        .collection("expenseDetails")
        .add({
          selectedValue,
          expenseTextDetails,
          expensePrice,
          CreatedAt: selectedDate,
          paymentMethod, // ✅ เพิ่มตรงนี้
          userID: user.uid,
        })
        .then((doc) => {
          console.log("Successfully added!");
          document.getElementById("show-message").innerHTML =
            "Successfully added!";
          document.getElementById("show-message").style.color = "green";
          document.getElementById("btn-load").style.display = "block";
          document.getElementById("expense-form").reset();
        })

        .catch((error) => {
          console.log(error);
        });
    };
  } else {
    // 🔒 If not logged in, redirect
    window.location = "../index.html";
  }
});
