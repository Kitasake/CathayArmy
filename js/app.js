const dataFiles = [
    "data/grand_cathay/lords.json",
    "data/grand_cathay/heroes.json",
    "data/grand_cathay/core_units.json",
    "data/grand_cathay/special_units.json",
    "data/grand_cathay/rare_units.json"
];

let army = [];
let totalPoints = 0;

async function loadAllData() {
    const results = await Promise.all(
        dataFiles.map(file => fetch(file).then(res => res.json()))
    );

    renderCategories(results);
}

function renderCategories(datasets) {
    const container = document.getElementById("categories");

    datasets.forEach(dataset => {
        const div = document.createElement("div");
        div.className = "category";

        const title = document.createElement("h2");
        title.textContent = dataset.category;
        div.appendChild(title);

        dataset.units.forEach(unit => {
            const unitDiv = document.createElement("div");
            unitDiv.className = "unit";

            const label = document.createElement("span");
            label.textContent = `${unit.name} (${unit.profile.points} pts)`;

            const button = document.createElement("button");
            button.textContent = "Add";
            button.onclick = () => addUnit(unit);

            unitDiv.appendChild(label);
            unitDiv.appendChild(button);
            div.appendChild(unitDiv);
        });

        container.appendChild(div);
    });
}

function addUnit(unit) {
    army.push(unit);
    totalPoints += unit.profile.points;

    updateArmyDisplay();
}

function removeUnit(index) {
    totalPoints -= army[index].profile.points;
    army.splice(index, 1);

    updateArmyDisplay();
}

function updateArmyDisplay() {
    const list = document.getElementById("armyList");
    list.innerHTML = "";

    army.forEach((unit, index) => {
        const li = document.createElement("li");
        li.textContent = `${unit.name} (${unit.profile.points} pts)`;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.onclick = () => removeUnit(index);

        li.appendChild(removeBtn);
        list.appendChild(li);
    });

    document.getElementById("totalPoints").textContent = totalPoints;
}

loadAllData();
