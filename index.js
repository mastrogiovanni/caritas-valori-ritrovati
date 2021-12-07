const { isIn } = require("class-validator");
const fs = require("fs")

function CSVToArray(strData, strDelimiter) {
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = strDelimiter || ",";

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
        // Delimiters.
        "(\\" +
        strDelimiter +
        "|\\r?\\n|\\r|^)" +
        // Quoted fields.
        '(?:"([^"]*(?:""[^"]*)*)"|' +
        // Standard fields.
        '([^"\\' +
        strDelimiter +
        "\\r\\n]*))",
        "gi"
    );

    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;

    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while ((arrMatches = objPattern.exec(strData))) {
        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[1];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
        ) {
            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push([]);
        }

        var strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[2]) {
            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[2].replace(
                new RegExp('""', "g"),
                '"'
            );
        } else {
            // We found a non-quoted value.
            strMatchedValue = arrMatches[3];
        }

        // Now that we have our value string, let's add
        // it to the data array.
        arrData[arrData.length - 1].push(strMatchedValue);
    }

    // Return the parsed data.
    return arrData;
}

function toObjectList(array) {
    return array.map((value, index, array) => {
        let result = {};
        let j = 0;
        for (let key of array[0]) {
            result[key] = value[j];
            j++;
        }
        return result;
    });
}

async function loadData() {
    let data = fs.readFileSync("./Giacenza.xlsx - Dati.csv");
    return toObjectList(CSVToArray(data.toString(), ",")).slice(1);
}

async function loadImages() {
    let response = {}

    const files = fs.readdirSync("./imgs")

    files.forEach(file => {
        let code = file.slice(0, 6);
        let name = file;
        response[code] = name;
    });

    return response;
}

const BASE_IMAGE = "https://sad-turing-785048.netlify.app/imgs/";

async function getDatabase() {
    const data = await loadData();
    const images = await loadImages();
    let result = {};
    for (let item of data) {
        let id = item["Cod. Art."];
        if (images[id]) {
            let image = encodeURI(BASE_IMAGE + images[id]);
            result[id] = {
                image,
                ...item,
            };
        }
        else {
            result[id] = item
        }
        result[id]["Classe Merc."] = result[id]["Classe Merc."].slice(8);
    }
    return result;
}

const COLUMNS = "Handle,Title,Body (HTML),Vendor,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / MPN,Google Shopping / AdWords Grouping,Google Shopping / AdWords Labels,Google Shopping / Condition,Google Shopping / Custom Product,Google Shopping / Custom Label 0,Google Shopping / Custom Label 1,Google Shopping / Custom Label 2,Google Shopping / Custom Label 3,Google Shopping / Custom Label 4,Variant Image,Variant Weight Unit,Variant Tax Code,Cost per item,Status,Standard Product Type,Custom Product Type".split(",");

function isInt(n){
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}

async function adaptToShopify(database) {
    let result = COLUMNS.join(",") + "\r\n";
    for (let key of Object.keys(database)) {
        let shopifyItem = {}
        shopifyItem['Handle'] = key;
        shopifyItem['Title'] = database[key]['Descrizione'];
        shopifyItem['Custom product type'] = database[key]['Classe Merc.'];
        shopifyItem['Published'] = "TRUE";
        
        if (isInt(database[key]['Giacenza'])) {
            shopifyItem['Variant Inventory Qty'] = database[key]['Giacenza'];
        }

        if (isFloat(database[key]['PPC'])) {
            shopifyItem['Variant Price'] = database[key]['PPC'];
        }

        if (database[key]['image']) {
            shopifyItem['Image Src'] = database[key]['image']
            shopifyItem['Image Alt Text'] = database[key]['Descrizione'];
        }
        shopifyItem['Status'] = 'active';

        let row = "";
        for (let column of COLUMNS) {
            if (shopifyItem[column]) {
                let value = shopifyItem[column];
                row += '"' + value.replace(/\"/g, '""') + '"';
            }
            row += ",";
        }
        row = row.slice(0, row.length - 1) + "\r\n"

        result += row;
    }
    return result;
}

(async () => {
    let database = await getDatabase();

    let result = await adaptToShopify(database);

    // console.log(database);

    console.log(result);

    /*
    let classList = new Set();
    classList.add("-");
    const codes = Object.keys(database);
    codes.forEach((code) => {
        classList.add(database[code]["Classe Merc."]);
    });
    classes = Array.from(classList).sort();
    console.log(classes);
    */

})();
