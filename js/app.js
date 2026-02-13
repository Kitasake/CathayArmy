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

function getMinimumSize(unit) {
    if (!unit.unitSize) return 1;

    // Extract number from "10+" etc.
    const match = unit.unitSize.match(/\d+/);
    return match ? parseInt(match[0]) : 1;
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

            const minSize = getMinimumSize(unit);

            const label = document.createElement("span");
            label.textContent = `${unit.name} (${unit.profile.points} pts/model, min ${minSize})`;

            const qtyInput = document.createElement("input");
            qtyInput.type = "number";
            qtyInput.min = minSize;
            qtyInput.value = minSize;
            qtyInput.style.width = "60px";
            qtyInput.style.marginLeft = "10px";

            const button = document.createElement("button");
            button.textContent = "Add";
            button.onclick = () => addUnit(unit, parseInt(qtyInput.value));

            unitDiv.appendChild(label);
            unitDiv.appendChild(qtyInput);
            unitDiv.appendChild(button);

            div.appendChild(unitDiv);
        });

        container.appendChild(div);
    });
}

function addUnit(unit, quantity) {
    const unitTotal = unit.profile.points * quantity;

    army.push({
        name: unit.name,
        pointsPerModel: unit.profile.points,
        quantity: quantity,
        total: unitTotal
    });

    totalPoints += unitTotal;
    updateArmyDisplay();
}

function removeUnit(index) {
    totalPoints -= army[index].total;
    army.splice(index, 1);
    updateArmyDisplay();
}

function updateArmyDisplay() {
    const list = document.getEle
