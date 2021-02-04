let transactions = [];
let lastCallTimestamp;
let myChart;

const storedTimestamp = localStorage.getItem('timestamp');
if(!storedTimestamp) {
  date = dayjs();
  lastCallTimestamp = date;
  localStorage.setItem('timestamp', date);
} else {
  lastCallTimestamp = storedTimestamp;
}

// fetch data on page load
fetch("/api/transaction")
  .then(response => {
    console.log('api fetched');
    return response;
  })
  .then(data => {
    const serverTime = data.headers.get('Date');
    const testtime = dayjs(serverTime);
    console.log(`The test time is ${testtime}`);
    // ############################################# change to using momentjs
    const d = dayjs();
    console.log(`The current time is ${}`);
    // localStorage.setItem('timestamp', lastCallTimestamp);
    return data.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;
    return data;
  })
  .then(() => {
    if (!navigator.onLine) {
      const transaction = db.transaction(["pending"], "readwrite");
      const store = transaction.objectStore("pending");
      // get all records from store and set to a variable

      const getAll = store.getAll();
      getAll.onsuccess = function () {
        if (getAll.result.length > 0) {
          getAll.result.forEach((item) => {
            transactions.unshift(item);
          })
          populateTotal();
          populateTable();
          populateChart();
          console.log("????????????????????PPPPPPPPPPPPPPPPPPPPPPPPPlease populate");
        }
      }
    }
    console.log("PPPPPPPPPPPPPPPPPPPPPPPPPlease populate");
    populateTotal();
    populateTable();
    populateChart();
  });

function populateTotal () {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable () {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart () {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: "Total Over Time",
        fill: true,
        backgroundColor: "#6666ff",
        data
      }]
    }
  });
}

function sendTransaction (isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();

  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      if (data.errors) {
        errorEl.textContent = "Missing Information";
      }
      else {
        // clear form
        nameEl.value = "";
        amountEl.value = "";
      }
    })
    .catch(err => {
      // fetch failed, so save in indexed db
      console.log("------------------------------------------------------catch err");
      console.error(err);
      saveRecord(transaction);

      // clear form
      nameEl.value = "";
      amountEl.value = "";
    });
}

document.querySelector("#add-btn").onclick = function () {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function () {
  sendTransaction(false);
};

if (navigator.onLine) {
  document.getElementById('online-status').innerHTML = 'Online';
  renderLastCallTimestamp();
} else {
  document.getElementById('online-status').innerHTML = 'Offline';
  renderLastCallTimestamp();
}


window.addEventListener('online', function (e) {
  document.getElementById('online-status').innerHTML = 'Online';
  renderLastCallTimestamp();
  console.log('online');
});

window.addEventListener('offline', function (e) {
  document.getElementById('online-status').innerHTML = 'Offline';
  renderLastCallTimestamp();
  console.log('offline');
});

function renderLastCallTimestamp() {
  document.getElementById('timestamp').innerHTML = lastCallTimestamp;
  console.log(`render lastCallTimestamp ${lastCallTimestamp}`);
}
