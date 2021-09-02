const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const port =  process.env.PORT || 8080;
var bodyParser = require('body-parser');
const e = require('express');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});

app.get('/', (req, res) => {
	res.send('Server is running!');
});

//Endpoint that fires a scrapeGoogle for each item
app.post('/scrape', (req, res) => {
	let items = req.body.items;
	let numResults = req.body.numResults;

	let promises = [];
	for(let item of items){
		promises.push(scrapeGoogle(item, numResults, req.body.includeTotal));
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

//Do a binary search w/requests to get number of results
const getNumResults = async (item) => {
	let l = 0;
	let r = 1000;
	while (l<r) {
		let index = Math.floor((l+r)/2);
		const { data } = await axios.get(
			// 'https://www.google.com/search?psb=1&tbm=shop&q=' + item
			'https://www.google.com/search?tbm=shop&q=' + item + '&hl=en&psb=1&ved=2ahUKEwiP1bX14pXyAhXjPgoDHQZTBcIQu-kFegQIABAT&start='+index
		);
		const $ = cheerio.load(data);
		let len = $('[class=rgHvZc]').length;
		if (len > 1) {
			l =  index+1;
		}
		else if (len === 0) {
			r = index-1;
		}
		else {
			break;
		}
	}
	return String(Math.floor((l+r)/2))
}

//Function that actually does the meat of the scraping. Returns an object 
//containing details for one item
const scrapeGoogle = async (item, numResults, includeTotal) => {
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

		if (includeTotal) {
			return ({
				'item' : item,
				'totalResults' : await getNumResults(item),
				'numResults' : newNumResults,
				'avgPrice' : avgPrice,
				'avgPriceNoShipping' : avgPriceNoShipping,
				'itemList' : returnItems
			})
		}
		else {
			return ({
				'item' : item,
				'numResults' : newNumResults,
				'avgPrice' : avgPrice,
				'avgPriceNoShipping' : avgPriceNoShipping,
				'itemList' : returnItems
			})
		}

	} catch (error) {
		throw error;
	}
};