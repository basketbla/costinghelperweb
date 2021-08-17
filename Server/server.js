const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const port =  process.env.PORT || 8080;
var bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});

app.get('/', (req, res) => {
	res.send('Server is running!');
});

app.post('/scrape', (req, res) => {
	let items = req.body.items;
	let numResults = req.body.numResults;
	let results = [];

	let promises = [];
	for(let item of items){
		promises.push(scrapeGoogle(item, numResults));
	}

	Promise.allSettled(promises)
		.then((results) => {
			console.log(results);
			res.send(results);
		})
		.catch((e) => {
			console.log(e)
		})
});

app.get('/location', (req, res) => {
	tempHelper('cane');
})

const tempHelper = async (item) => {
	const { data } = await axios.get(
		// 'https://www.google.com/search?psb=1&tbm=shop&q=' + item
		'https://www.google.com/search?tbm=shop&q=' + item + '&hl=en&psb=1&ved=2ahUKEwiP1bX14pXyAhXjPgoDHQZTBcIQu-kFegQIABAT'
	);
	const $ = cheerio.load(data);
	$('[class=CV7Lzb]').each((index, value) => {
		res.send(value);
	});
}

//Function that actually does the meat of the scraping. Returns an object 
//containing details for one item
const scrapeGoogle = async (item, numResults) => {
	try {
		const { data } = await axios.get(
			// 'https://www.google.com/search?psb=1&tbm=shop&q=' + item
			'https://www.google.com/search?tbm=shop&q=' + item + '&hl=en&psb=1&ved=2ahUKEwiP1bX14pXyAhXjPgoDHQZTBcIQu-kFegQIABAT'
		);
		const $ = cheerio.load(data);

		//Initialize lists
		let items = [];
		let prices = [];
		let shipping = [];
		let sellers = [];

		//Scrape data
		$('[class=rgHvZc]').each((index, value) => {
			const itemName = $(value).text();
			items.push(itemName);
		});

		$('[class=HRLxBb]').each((index, value) => {
			const price = $(value).text();
			prices.push(price);
		});

		$('span[class=dD8iuc]').each((index, value) => {
			const shippingItem = $(value).text();
			shipping.push(shippingItem);
		});

		$('div[class=dD8iuc]').each((index, value) => {
			const seller = $(value).text();
			sellers.push(seller);
		});

		//Adjust num results
		let newNumResults = Math.min(numResults, items.length, prices.length, shipping.length, sellers.length);
		let changed = false;
		if (newNumResults < numResults) {
			changed = true;
		}

		//Adjust the array lengths
		items = items.slice(0, newNumResults);
		prices = prices.slice(0, newNumResults);
		shipping = shipping.slice(0, newNumResults);
		sellers = sellers.slice(0, newNumResults);

		//Do formatting
		for(let i = 0; i < newNumResults; i++) {
			prices[i] = Number(prices[i].substring(1).replace(',',''));
			if (shipping[i] === 'Free shipping') {
				shipping[i] = 0;
			}
			else {
				shipping[i] = Number(shipping[i].substring(2, shipping[i].indexOf('s')-1).replace(','));
			}
			sellers[i] = sellers[i].substring(sellers[i].indexOf('from')+5)
		}

		let sumReducer = (a, b) => a + b;
		let avgPrice = (prices.reduce(sumReducer, 0) + shipping.reduce(sumReducer, 0)) / newNumResults;
		let avgPriceNoShipping = prices.reduce(sumReducer, 0) / newNumResults;
		let returnItems = [];

		//Generate return items
		for(let i = 0; i < newNumResults; i++) {
			returnItems.push({
				'item' : items[i],
				'price' : prices[i],
				'shipping' : shipping[i],
				'seller' : sellers[i]
			});
		}

		return ({
			'item' : item,
			'numResults' : newNumResults,
			'avgPrice' : avgPrice,
			'avgPriceNoShipping' : avgPriceNoShipping,
			'itemList' : returnItems
		})

	} catch (error) {
		throw error;
	}
};