const months = [
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July"
];

const defaultState = {
  grossPay: 852.94,
  withholdingRate: 0.10,
  currentBalance: 6000,
  safetyFloor: 3000,
  carReserve: 100,
  checkingBuffer: 500,

  expenses: {
    rent: 450,
    utilities: 50,
    groceries: 45,
    restaurants: 30,
    gas: 30,
    shopping: 20,
    entertainment: 10,
    otherMisc: 20
  },

  paychecks: {
    August: 1,
    September: 2,
    October: 2,
    November: 2,
    December: 1,
    January: 2,
    February: 2,
    March: 2,
    April: 2,
    May: 1,
    June: 0,
    July: 0
  },

  transactions: []
};

let state = JSON.parse(localStorage.getItem("financeTrackerState")) || structuredClone(defaultState);

const $ = id => document.getElementById(id);

function money(value) {
  return Number(value).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

function saveState() {
  localStorage.setItem("financeTrackerState", JSON.stringify(state));
}

function loadInputs() {
  $("grossPay").value = state.grossPay;
  $("withholdingRate").value = state.withholdingRate;
  $("currentBalance").value = state.currentBalance;
  $("safetyFloor").value = state.safetyFloor;
  $("carReserve").value = state.carReserve;
  $("checkingBuffer").value = state.checkingBuffer;

  $("rent").value = state.expenses.rent;
  $("utilities").value = state.expenses.utilities;
  $("groceries").value = state.expenses.groceries;
  $("restaurants").value = state.expenses.restaurants;
  $("gas").value = state.expenses.gas;
  $("shopping").value = state.expenses.shopping;
  $("entertainment").value = state.expenses.entertainment;
  $("otherMisc").value = state.expenses.otherMisc;
}

function buildPaycheckInputs() {
  const grid = $("paycheckGrid");
  grid.innerHTML = "";

  months.forEach(month => {
    const label = document.createElement("label");
    label.innerHTML = `
      ${month}
      <input type="number" min="0" step="1" id="paycheck-${month}" value="${state.paychecks[month]}" />
    `;

    grid.appendChild(label);

    label.querySelector("input").addEventListener("input", event => {
      state.paychecks[month] = Number(event.target.value || 0);
      render();
    });
  });
}

function readInputs() {
  state.grossPay = Number($("grossPay").value || 0);
  state.withholdingRate = Number($("withholdingRate").value || 0);
  state.currentBalance = Number($("currentBalance").value || 0);
  state.safetyFloor = Number($("safetyFloor").value || 0);
  state.carReserve = Number($("carReserve").value || 0);
  state.checkingBuffer = Number($("checkingBuffer").value || 0);

  state.expenses.rent = Number($("rent").value || 0);
  state.expenses.utilities = Number($("utilities").value || 0);
  state.expenses.groceries = Number($("groceries").value || 0);
  state.expenses.restaurants = Number($("restaurants").value || 0);
  state.expenses.gas = Number($("gas").value || 0);
  state.expenses.shopping = Number($("shopping").value || 0);
  state.expenses.entertainment = Number($("entertainment").value || 0);
  state.expenses.otherMisc = Number($("otherMisc").value || 0);
}

function getMonthlyLivingCosts() {
  return Object.values(state.expenses).reduce((sum, value) => sum + Number(value), 0);
}

function getNetPay() {
  return state.grossPay * (1 - state.withholdingRate);
}

function buildMonthlyPlan() {
  const netPay = getNetPay();
  const livingCosts = getMonthlyLivingCosts();

  let startingBalance = state.currentBalance;

  return months.map(month => {
    const paycheckCount = Number(state.paychecks[month] || 0);
    const income = paycheckCount * netPay;
    const surplus = income - livingCosts - state.carReserve;
    const endingBalance = startingBalance + surplus;

    let status = "Good";
    if (endingBalance < state.safetyFloor) {
      status = "Below floor";
    } else if (endingBalance < state.safetyFloor + state.checkingBuffer) {
      status = "Watch";
    }

    const row = {
      month,
      paycheckCount,
      income,
      livingCosts,
      carReserve: state.carReserve,
      surplus,
      startingBalance,
      endingBalance,
      status
    };

    startingBalance = endingBalance;
    return row;
  });
}

function renderSnapshot(plan) {
  const netPay = getNetPay();
  const monthlyCosts = getMonthlyLivingCosts();
  const totalPaychecks = months.reduce((sum, month) => sum + Number(state.paychecks[month] || 0), 0);
  const finalMonth = plan[plan.length - 1];

  $("netPay").textContent = money(netPay);
  $("monthlyCosts").textContent = money(monthlyCosts);
  $("annualNetPay").textContent = money(netPay * totalPaychecks);
  $("aboveFloor").textContent = money(state.currentBalance - state.safetyFloor);

  $("endingBalance").textContent = money(finalMonth.endingBalance);

  if (finalMonth.status === "Good") {
    $("endingStatus").textContent = "Projected to stay above your safety floor plus buffer.";
    $("endingStatus").className = "status-good";
  } else if (finalMonth.status === "Watch") {
    $("endingStatus").textContent = "Projected close to your safety floor.";
    $("endingStatus").className = "status-watch";
  } else {
    $("endingStatus").textContent = "Projected below your safety floor.";
    $("endingStatus").className = "status-bad";
  }
}

function renderMonthlyTable(plan) {
  const table = $("monthlyTable");

  table.innerHTML = plan.map(row => {
    const statusClass =
      row.status === "Good"
        ? "status-good"
        : row.status === "Watch"
          ? "status-watch"
          : "status-bad";

    return `
      <tr>
        <td>${row.month}</td>
        <td>${row.paycheckCount}</td>
        <td>${money(row.income)}</td>
        <td>${money(row.livingCosts)}</td>
        <td>${money(row.carReserve)}</td>
        <td>${money(row.surplus)}</td>
        <td>${money(row.startingBalance)}</td>
        <td>${money(row.endingBalance)}</td>
        <td class="${statusClass}">${row.status}</td>
      </tr>
    `;
  }).join("");
}

function drawChart(plan) {
  const canvas = $("balanceChart");
  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;
  const padding = 48;

  ctx.clearRect(0, 0, width, height);

  const balances = plan.map(row => row.endingBalance);
  const allValues = [...balances, state.safetyFloor, state.currentBalance];

  const minValue = Math.min(...allValues) - 400;
  const maxValue = Math.max(...allValues) + 400;

  function x(index) {
    return padding + index * ((width - padding * 2) / (plan.length - 1));
  }

  function y(value) {
    return height - padding - ((value - minValue) / (maxValue - minValue)) * (height - padding * 2);
  }

  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    const gridY = padding + i * ((height - padding * 2) / 4);
    ctx.beginPath();
    ctx.moveTo(padding, gridY);
    ctx.lineTo(width - padding, gridY);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(padding, y(state.safetyFloor));
  ctx.lineTo(width - padding, y(state.safetyFloor));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "14px system-ui";
  ctx.fillText("Safety floor", padding + 8, y(state.safetyFloor) - 8);

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 4;
  ctx.beginPath();

  balances.forEach((balance, index) => {
    if (index === 0) {
      ctx.moveTo(x(index), y(balance));
    } else {
      ctx.lineTo(x(index), y(balance));
    }
  });

  ctx.stroke();

  balances.forEach((balance, index) => {
    if (balance >= state.safetyFloor + state.checkingBuffer) {
      ctx.fillStyle = "#34d399";
    } else if (balance >= state.safetyFloor) {
      ctx.fillStyle = "#fbbf24";
    } else {
      ctx.fillStyle = "#fb7185";
    }

    ctx.beginPath();
    ctx.arc(x(index), y(balance), 6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "13px system-ui";

  plan.forEach((row, index) => {
    if (index % 2 === 0 || window.innerWidth > 900) {
      ctx.fillText(row.month.slice(0, 3), x(index) - 12, height - 16);
    }
  });
}

function renderTransactions() {
  const table = $("transactionTable");

  table.innerHTML = state.transactions.map((transaction, index) => {
    return `
      <tr>
        <td>${transaction.date}</td>
        <td>${transaction.month}</td>
        <td>${transaction.category}</td>
        <td>${money(transaction.amount)}</td>
        <td>${transaction.needWant}</td>
        <td>${transaction.notes}</td>
        <td><button class="danger" onclick="deleteTransaction(${index})">Delete</button></td>
      </tr>
    `;
  }).join("");
}

function deleteTransaction(index) {
  state.transactions.splice(index, 1);
  saveState();
  render();
}

function addInputListeners() {
  const inputIds = [
    "grossPay",
    "withholdingRate",
    "currentBalance",
    "safetyFloor",
    "carReserve",
    "checkingBuffer",
    "rent",
    "utilities",
    "groceries",
    "restaurants",
    "gas",
    "shopping",
    "entertainment",
    "otherMisc"
  ];

  inputIds.forEach(id => {
    $(id).addEventListener("input", () => {
      readInputs();
      render();
    });
  });
}

function render() {
  readInputs();
  const plan = buildMonthlyPlan();

  renderSnapshot(plan);
  renderMonthlyTable(plan);
  drawChart(plan);
  renderTransactions();
}

$("saveButton").addEventListener("click", () => {
  readInputs();
  saveState();
  alert("Saved locally in this browser.");
});

$("resetButton").addEventListener("click", () => {
  localStorage.removeItem("financeTrackerState");
  state = structuredClone(defaultState);
  loadInputs();
  buildPaycheckInputs();
  render();
});

$("transactionForm").addEventListener("submit", event => {
  event.preventDefault();

  const date = $("transactionDate").value;
  const month = new Date(date + "T00:00:00").toLocaleString(undefined, { month: "long" });

  state.transactions.unshift({
    date,
    month,
    category: $("transactionCategory").value,
    amount: Number($("transactionAmount").value || 0),
    needWant: $("needWant").value,
    notes: $("transactionNotes").value
  });

  saveState();
  $("transactionForm").reset();
  render();
});

$("exportButton").addEventListener("click", () => {
  const header = ["Date", "Month", "Category", "Amount", "Need or Want", "Notes"];

  const rows = state.transactions.map(transaction => [
    transaction.date,
    transaction.month,
    transaction.category,
    transaction.amount,
    transaction.needWant,
    transaction.notes
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "spending-log.csv";
  link.click();

  URL.revokeObjectURL(url);
});

$("clearTransactionsButton").addEventListener("click", () => {
  if (confirm("Clear all transactions?")) {
    state.transactions = [];
    saveState();
    render();
  }
});

loadInputs();
buildPaycheckInputs();
addInputListeners();
render();
