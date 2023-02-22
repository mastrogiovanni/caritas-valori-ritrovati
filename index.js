const { isIn } = require("class-validator");
const fs = require("fs")
const ObjectsToCsv = require('objects-to-csv');

const rootDir = "data";
const BASE_IMAGE = "https://sad-turing-785048.netlify.app/imgs/";

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

async function loadData(fileName, delim) {
    let data = fs.readFileSync(rootDir + "/" + fileName);
    return toObjectList(CSVToArray(data.toString(), delim)).slice(1);
}

async function loadImages() {
    let response = {}

    const files = fs.readdirSync(rootDir + "/imgs")

    files.forEach(file => {
        let code = file.slice(0, 6);
        let name = file;
        response[code] = name;
    });

    return response;
}

async function getDatabase(fileName, delim) {
    const data = await loadData(fileName, delim);
    const images = await loadImages();
    let result = {};
    for (let item of data) {
        let id = item["Cod. Art."];
        console.log(id)
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

const COLUMNS = "Cost per item,Handle,Title,Body (HTML),Vendor,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / MPN,Google Shopping / AdWords Grouping,Google Shopping / AdWords Labels,Google Shopping / Condition,Google Shopping / Custom Product,Google Shopping / Custom Label 0,Google Shopping / Custom Label 1,Google Shopping / Custom Label 2,Google Shopping / Custom Label 3,Google Shopping / Custom Label 4,Variant Image,Variant Weight Unit,Variant Tax Code,Status,Standard Product Type,Custom Product Type".split(",");

function isInt(n){
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}

async function adaptToShopify(database) {
    // let result = COLUMNS.join(",") + "\r\n";

    let result = [];
    for (let key of Object.keys(database)) {

        // console.log(database[key])

        let shopifyItem = {}
        shopifyItem['Handle'] = key;
        shopifyItem['Title'] = database[key]['Descrizione'];
        
        shopifyItem['Option1 Name'] = 'Title';
        shopifyItem['Option1 Value'] = 'Default Title';

        shopifyItem['Custom Product Type'] = database[key]['Classe Merc.'];
        shopifyItem['Published'] = "TRUE";
        shopifyItem['Variant Inventory Qty'] = '' + parseInt(database[key]['Esistenza']);
        
        let price = database[key]['Listino'];
        price = parseFloat(('' + price).replace(',', '.'));
        shopifyItem['Variant Price'] = '' + price;

        shopifyItem['Variant Inventory Policy'] = 'deny'
        shopifyItem['Variant Fulfillment Service'] = 'manual'

        shopifyItem['SEO Title'] = database[key]['Descrizione'];
        shopifyItem['SEO Description'] = database[key]['Descrizione'];


        if (database[key]['image']) {
            shopifyItem['Image Src'] = database[key]['image']
            shopifyItem['Image Alt Text'] = database[key]['Descrizione'];
        }
        shopifyItem['Status'] = 'active';

        for (let column of COLUMNS) {
            if (!shopifyItem[column]) {
                shopifyItem[column] = ''
            }
        }

        result.push(shopifyItem);
        /*
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
        */
    }
    return new ObjectsToCsv(result).toString();
}

function usage() {
    console.log("Example:")
    console.log("docker run -v $(pwd)/data:/data mastrogiovanni/caritas-valori-ritrovati:latest")
    console.log("The software espect in current 'data' subdir the following:")
    console.log("giacenza.csv (Giacenza file)")
    console.log("imgs (A directory containing images)");
}

(async () => {

    /*
    let database = await getDatabase("giacenza.csv", ";");

    let old = await getDatabase("giacenza-31032022.csv", ",");

    for (let key of Object.keys(database)) {
        // console.log(key)
        if (old[key] && old[key]['PPC'] !== database[key]['PPC']) {
            console.log(key)
        }
    }
    */

    if (!fs.existsSync(rootDir + "/giacenza.csv")) {
        usage();
        return;
    }

    if (!fs.statSync(rootDir + "/imgs").isDirectory()) {
        usage();
        return;
    }

    let database = await getDatabase("giacenza.csv", ";");

    // console.log(database);

    let result = await adaptToShopify(database);

    fs.writeFileSync(rootDir + "/import.csv", result)

    console.log("Result are saved in file 'import.csv'");

})();
