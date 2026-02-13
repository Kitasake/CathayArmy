const dataFiles = [
    "data/grand_cathay/units/lords.json",
    "data/grand_cathay/units/heroes.json",
    "data/grand_cathay/units/core_units.json",
    "data/grand_cathay/units/special_units.json",
    "data/grand_cathay/units/rare_units.json",
    "data/grand_cathay/wargear/magic_items.json"

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

    const magicItemsData = results.find(d => d.category === "Magic Items");
    const unitData = results.filter(d => d.category !== "Magic Items");
    
    window.magicItems = magicItemsData ? magicItemsData.items : [];
    
    renderCategories(unitData);

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

            // MOUNT SELECTION (radio group)
            if (unit.mounts && unit.mounts.length > 0) {
            
                const mountDiv = document.createElement("div");
                mountDiv.style.marginTop = "8px";
            
                const title = document.createElement("strong");
                title.textContent = "Mount:";
                mountDiv.appendChild(title);
            
                unit.mounts.forEach(mount => {
            
                    const radio = document.createElement("input");
                    radio.type = "radio";
                    radio.name = `${unit.name}_mount`;
                    radio.value = mount.name;
                    radio.dataset.cost = mount.cost;
            
                    const label = document.createElement("label");
                    label.textContent = ` ${mount.name} (${mount.cost})`;
            
                    mountDiv.appendChild(document.createElement("br"));
                    mountDiv.appendChild(radio);
                    mountDiv.appendChild(label);
                });
            
                unitDiv.appendChild(mountDiv);
            }

            // MAGIC ITEMS (characters only)
            if (unit.magicItemLimit && window.magicItems.length > 0) {
            
                const magicDiv = document.createElement("div");
                magicDiv.style.marginTop = "8px";
            
                const title = document.createElement("strong");
                title.textContent = `Magic Items (max ${unit.magicItemLimit} pts):`;
                magicDiv.appendChild(title);
            
                window.magicItems.forEach(item => {
            
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.value = item.name;
                    checkbox.dataset.cost = item.cost;
            
                    const label = document.createElement("label");
                    label.textContent = ` ${item.name} (+${item.cost} pts)`;
            
                    magicDiv.appendChild(document.createElement("br"));
                    magicDiv.appendChild(checkbox);
                    magicDiv.appendChild(label);
                });
            
                unitDiv.appendChild(magicDiv);
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

    let mountSelected = null;
    let magicItemsSelected = [];
    let magicItemPoints = 0;

    const inputs = upgradesContainer
        .parentElement
        .querySelectorAll("input");

    // 🔥 THIS BLOCK replaces your old inputs.forEach()
    inputs.forEach(input => {

        if ((input.type === "checkbox" && input.checked) ||
            (input.type === "radio" && input.checked)) {

            const cost = parseCost(input.dataset.cost, quantity);

            // MOUNT
            if (input.name && input.name.includes("_mount")) {

                mountSelected = {
                    name: input.value,
                    cost: cost
                };

                upgradePoints += cost;
            }

            // MAGIC ITEMS
            else if (
                unit.magicItemLimit &&
                input.type === "checkbox" &&
                window.magicItems.some(m => m.name === input.value)
            ) {

                magicItemsSelected.push({
                    name: input.value,
                    cost: cost
                });

                magicItemPoints += cost;
            }

            // NORMAL UPGRADES
            else {

                upgrades.push({
                    name: input.value,
                    cost: cost
                });

                upgradePoints += cost;
            }
        }
    });

    // 🔥 STEP 5 — MAGIC ITEM LIMIT CHECK GOES HERE
    if (unit.magicItemLimit && magicItemPoints > unit.magicItemLimit) {
        alert(`Magic item limit exceeded (${unit.magicItemLimit} pts max).`);
        return;
    }

    // Add magic item cost to total upgrades
    upgradePoints += magicItemPoints;

    const total = basePoints + upgradePoints;

    // Army size check
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
        mount: mountSelected,
        magicItems: magicItemsSelected,
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

        if (unit.mount) {
            const m = document.createElement("div");
            m.textContent = `Mount: ${unit.mount.name} (+${unit.mount.cost} pts)`;
            li.appendChild(m);
        }

        if (unit.magicItems && unit.magicItems.length > 0) {
            const miDiv = document.createElement("div");
            miDiv.innerHTML = "<em>Magic Items:</em>";
        
            const ul = document.createElement("ul");
        
            unit.magicItems.forEach(mi => {
                const liItem = document.createElement("li");
                liItem.textContent = `${mi.name} (+${mi.cost} pts)`;
                ul.appendChild(liItem);
            });
        
            li.appendChild(miDiv);
            li.appendChild(ul);
        }

        
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

function generateArmyText() {

    let output = "";
    output += `Grand Cathay Army List\n`;
    output += `Target Size: ${targetArmySize} pts\n`;
    output += `Total Points: ${totalPoints} pts\n`;
    output += `Remaining: ${targetArmySize - totalPoints} pts\n\n`;

    const categories = {};

    army.forEach(unit => {
        if (!categories[unit.category]) {
            categories[unit.category] = [];
        }
        categories[unit.category].push(unit);
    });

    Object.keys(categories).forEach(category => {

        output += `=== ${category.toUpperCase()} ===\n\n`;

        categories[category].forEach(unit => {

            output += `${unit.quantity}x ${unit.name} — ${unit.total} pts\n`;

            if (unit.mount) {
                output += `  Mount: ${unit.mount.name} (+${unit.mount.cost})\n`;
            }

            if (unit.upgrades.length > 0) {
                unit.upgrades.forEach(upg => {
                    output += `  Upgrade: ${upg.name} (+${upg.cost})\n`;
                });
            }

            if (unit.magicItems && unit.magicItems.length > 0) {
                unit.magicItems.forEach(mi => {
                    output += `  Magic Item: ${mi.name} (+${mi.cost})\n`;
                });
            }

            output += "\n";
        });
    });

    return output;
}

document.getElementById("exportTextBtn").addEventListener("click", () => {

    const text = generateArmyText();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `grand_cathay_${targetArmySize}pts.txt`;
    a.click();

    URL.revokeObjectURL(url);
});

document.getElementById("exportPdfBtn").addEventListener("click", () => {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const text = generateArmyText();

    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 10);

    doc.save(`grand_cathay_${targetArmySize}pts.pdf`);
});


loadAllData();
