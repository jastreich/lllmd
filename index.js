
const fs = require('fs');
const { get } = require('https');

var propertyIds = [];
var propertyOwners = [];
var records = [];
var errorIds = [];

const pluck = (arr, key) => arr.map(i => i[key]);

async function getPropertyData(id)
{
    const propertyURL = `https://ascent.co.walworth.wi.us/LandRecords/api/RealEstateTaxParcelService/${id}`;
    const resp = await fetch(propertyURL);
    const propertyData = await resp.json();
    return propertyData;
}

async function populate()
{
    const url = 'https://ascent.co.walworth.wi.us/LandRecords/api/RealEstateTaxParcelService?municipality=613&parcelNum=&streetNum=&streetName=&streetAddress=&UsplsNum=&townlocation=&locationtype=&firstName=&lastName=&sortBy=PAR_NUM_SRT&numRecords=5000&inactive=false&deleted=false&page=1&bankrupt=false&StateAssessed=false&tags=&tagInd=0';
    let response = await fetch(url);
    let data = await response.json();

    for(let index = 0;index < data.Results.length;++index){
        let item = data.Results[index];

        console.log(item.ParcelId);
        const propertyData = await getPropertyData(item.ParcelId);

        if('Message' in propertyData){ // Errors have the message attribute.
            console.log('Error.');
            errorIds.push(item.ParcelId);
            continue;
        } else {
            console.log('property.');
        }

        if('OtherDistricts' in propertyData){
            for(let districtIndex = 0;districtIndex < propertyData.OtherDistricts.length;++districtIndex){
                let theDistrict =  propertyData.OtherDistricts[districtIndex];
                if(theDistrict.DistrictId == 683){
                    propertyIds.push(item.ParcelId);
                    propertyOwners.push(item.Owners);
                    console.log('In District.');
                }
            }
        }
    }
    
    for(let index = 0;index < propertyIds.length;++index){
        records.push({
            id: propertyIds[index],
            owners: propertyOwners[index]
        });
    }
    console.log('---');
    fs.writeFile('output.json', JSON.stringify(records), ()=>{ console.error(records); });
    fs.writeFile('errors.json',JSON.stringify(errorIds), ()=>{});
}

async function loadRecords(){
    let data = fs.readFileSync('output.json');
    records = await JSON.parse(data);
}

async function findUpdates(){
    await loadRecords();
    for(let index = 0;index < records.length;++index){
        let item = records[index];
        const propertyData = await getPropertyData(item.id);
        if('Message' in propertyData){
            errorIds.push(item.id);
        } else {
            let oldOwners = pluck(item.owners,'PersonId');
            //console.log(propertyData);
            let newOwners = pluck(propertyData.Persons,'PersonId');
            const result = oldOwners.every(value => newOwners.includes(value));
            if(!result){
                console.error(item.id);
                if(propertyData.SiteAddresses.length){
                    console.log(propertyData.SiteAddresses[0].Format);
                }
                console.log('New Owners');
/*
                console.log(' - old - ');
                console.log(oldOwners);
                console.log(' - new - ');
                console.log(newOwners);
*/
                console.log(propertyData.Persons);
            }
        }

    }
}

//populate();

findUpdates();
