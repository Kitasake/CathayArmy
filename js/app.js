const dataFiles = [
    "data/grand_cathay/lords.json",
    "data/grand_cathay/heroes.json",
    "data/grand_cathay/core_units.json",
    "data/grand_cathay/special_units.json",
    "data/grand_cathay/rare_units.json"
];

let army = [];
let totalPoints = 0;
let targetArmySize = 2000;

const CATEGORY_LIMITS = {
    "Lords": { max: 0.25 },
    "Heroes": { max: 0.50 },
    "Core": { min: 0.25 },
    "Special": { max: 0.50 },
    "Rare": { max: 0.25 }
};

const armySizeSelect = document.getElementById("armySizeSelect");
const customArmySizeInput = document.getElementById("customArmySize");

armySizeSelect.addEventListener("change", () => {

    if (armySizeSelect.value === "custom") {
        customArmySizeInput.style.display = "inline-block";
        targetArmySize = parseInt(customArmySizeInput.value) || 0;
    } else {
        customArmySizeInput.style.display = "none";
        targetArmySize = parseInt(armySizeSelect.value);
    }

    updateArmyDisplay();
});

customArmySizeInput.addEventListener("input", () => {
    targetArmySize = parseInt(customArmySizeInput.value) || 0;
    updateArmyDisplay();
});



async function loadAllData() {
    const results = await Promise.all(
        dataFiles.map(file => fetch(file).then(res => res.json()))
    );

    renderCategories(results);
}

function getMinimumSize(unit) {
    if (!unit.unitSize) return 1;
    const match = unit.unitSize.match(/\d+/);
    return match ? parseInt(match[0]) : 1;
}

function parseCost(costString, quantity) {
    if (!costString) return 0;

    const numberMatch = costString.match(/[\d.]+/);
    if (!numberMatch) return 0;

    const value = parseFloat(numberMatch[0]);

    if (costString.includes("per model")) {
        return value * quantity;
    }

    return value;
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

            const label = document.createElement("div");
            label.innerHTML = `<strong>${unit.name}</strong> (${unit.profile.points} pts/model, min ${minSize})`;

            const qtyInput = document.createElement("input");
            qtyInput.type = "number";
            qtyInput.min = minSize;
            qtyInput.value = minSize;
            qtyInput.style.width = "60px";

            const upgradesContainer = document.createElement("div");
            upgradesContainer.style.marginLeft = "20px";

            if (unit.options) {
                unit.options.forEach(option => {

                    // OPTION GROUP (radio buttons)
                    if (option.group && option.choices) {
                        const groupDiv = document.createElement("div");
                        groupDiv.innerHTML = `<em>${option.group}</em>`;

                        option.choices.forEach(choice => {
                            const radio = document.createElement("input");
                            radio.type = "radio";
                            radio.name = `${unit.name}_${option.group}`;
                            radio.value = choice.name;
                            radio.dataset.cost = choice.cost;

                            const label = document.createElement("label");
                            label.textContent = ` ${choice.name} (${choice.cost})`;

                            groupDiv.appendChild(document.createElement("br"));
                            groupDiv.appendChild(radio);
                            groupDiv.appendChild(label);
                        });

                        upgradesContainer.appendChild(groupDiv);
                    }

                    // SINGLE CHECKBOX OPTION
                    else if (option.name) {
                        const checkbox = document.createElement("input");
                        checkbox.type = "checkbox";
                        checkbox.value = option.name;
                        checkbox.dataset.cost = option.cost;

                        const label = document.createElement("label");
                        label.textContent = ` ${option.name} (${option.cost})`;

                        upgradesContainer.appendChild(document.createElement("br"));
                        upgradesContainer.appendChild(checkbox);
                        upgradesContainer.appendChild(label);
                    }
                });
            }

            const button = document.createElement("button");
            button.textContent = "Add";
            button.onclick = () =>
            addUnit(unit, parseInt(qtyInput.value), upgradesContainer, dataset.category);


            unitDiv.appendChild(label);
            unitDiv.appendChild(qtyInput);
            unitDiv.appendChild(upgradesContainer);
            unitDiv.appendChild(document.createElement("br"));
            unitDiv.appendChild(button);

            div.appendChild(unitDiv);
        });

        container.appendChild(div);
    });
}

function addUnit(unit, quantity, upgradesContainer, category) {
    let basePoints = unit.profile.points * quantity;
    let upgrades = [];
    let upgradePoints = 0;

    const inputs = upgradesContainer.querySelectorAll("input");

    inputs.forEach(input => {
        if ((input.type === "checkbox" && input.checked) ||
            (input.type === "radio" && input.checked)) {

            const cost = parseCost(input.dataset.cost, quantity);

            upgrades.push({
                name: input.value,
                cost: cost
            });

            upgradePoints += cost;
        }
    });

    const total = basePoints + upgradePoints;

    // Simulate new total before adding
    const simulatedTotal = totalPoints + total;

    if (simulatedTotal > targetArmySize) {
        alert("Adding this unit exceeds the target army size.");
        return;
    }
    
    if (!validateCategoryLimit(category, total)) {
        alert(`Cannot add ${unit.name}. Category limit exceeded.`);
        return;
    }


    army.push({
        name: unit.name,
        quantity: quantity,
        basePoints: basePoints,
        upgrades: upgrades,
        total: total,
        category: category
    });

    totalPoints += total;
    updateArmyDisplay();
}


function removeUnit(index) {
    totalPoints -= army[index].total;
    army.splice(index, 1);
    updateArmyDisplay();
}

function updateArmyDisplay() {
    const list = document.getElementById("armyList");
    list.innerHTML = "";

    army.forEach((unit, index) => {
        const li = document.createElement("li");

        li.innerHTML = `<strong>${unit.quantity}x ${unit.name}</strong> (${unit.total} pts)`;

        if (unit.upgrades.length > 0) {
            const ul = document.createElement("ul");
            unit.upgrades.forEach(upg => {
                const sub = document.createElement("li");
                sub.textContent = `${upg.name} (+${upg.cost} pts)`;
                ul.appendChild(sub);
            });
            li.appendChild(ul);
        }

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.onclick = () => removeUnit(index);

        li.appendChild(removeBtn);
        list.appendChild(li);

        document.getElementById("remainingPoints").textContent =
        targetArmySize - totalPoints;
    });

    document.getElementById("totalPoints").textContent = totalPoints;
    const warnings = validateArmyComposition();

    const warningDiv = document.getElementById("warnings");
    warningDiv.innerHTML = "";
    
    warnings.forEach(w => {
        const p = document.createElement("p");
        p.style.color = "red";
        p.textContent = w;
        warningDiv.appendChild(p);
    });

}

function validateCategoryLimit(category, newUnitPoints) {

    const limits = CATEGORY_LIMITS[category];
    if (!limits) return true;

    const categoryPoints = army
        .filter(u => u.category === category)
        .reduce((sum, u) => sum + u.total, 0) + newUnitPoints;

    if (limits.max) {
        if (categoryPoints > targetArmySize * limits.max) {
            return false;
        }
    }

    return true;
}


function validateArmyComposition() {

    const warnings = [];

    Object.keys(CATEGORY_LIMITS).forEach(category => {

        const limits = CATEGORY_LIMITS[category];

        const categoryPoints = army
            .filter(u => u.category === category)
            .reduce((sum, u) => sum + u.total, 0);

        if (limits.min) {
            if (categoryPoints < targetArmySize * limits.min) {
                warnings.push(
                    `${category} must be at least ${limits.min * 100}% (${Math.ceil(targetArmySize * limits.min)} pts)`
                );
            }
        }

        if (limits.max) {
            if (categoryPoints > targetArmySize * limits.max) {
                warnings.push(
                    `${category} exceeds ${limits.max * 100}% (${Math.floor(targetArmySize * limits.max)} pts)`
                );
            }
        }
    });

    if (totalPoints > targetArmySize) {
        warnings.push("Army exceeds target size.");
    }

    if (totalPoints < targetArmySize) {
        warnings.push(`Army is ${targetArmySize - totalPoints} pts under target.`);
    }

    return warnings;
}


document.getElementById("armySizeInput").addEventListener("input", (e) => {
    targetArmySize = parseInt(e.target.value) || 0;
    updateArmyDisplay();
});


loadAllData();
