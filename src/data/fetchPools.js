import fs from 'fs';

const url = 'https://api.bitshares.ws/openexplorer/pools';

fetch(url)
    .then(res => res.json())
    .then(data => {
        fs.writeFile('./src/data/pools.json', JSON.stringify(data, undefined, 4), (err) => {
            if (err) throw err;
            console.log('Pools data saved to pools.json');
        });
    })
    .catch(err => console.log('Error: ' + err.message));
