const express = require('express');
const rateLimit = require("express-rate-limit");
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const port =  process.env.PORT || 8080;
var bodyParser = require('body-parser');
const e = require('express');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10000 // limit each IP to 10000 requests per windowMs
});

// delay function to wait limit rate of requests
const delay = ms => new Promise(res => setTimeout(res, ms));

//  Trying to fix the 429 issue :/
// Ohhh it's not with me, it's with Google Shopping.
app.use(limiter);

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
		promises.push(
			scrapeGoogle(
				item, 
				numResults, 
				req.body.includeTotal, 
				req.body.includeStats,
				req.body.includeME,
				req.body.includeCL,
				req.body.includeSS
			)
		);
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

		// To limit frequency of requests (waits 1 second)
		delay(1000);

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
const scrapeGoogle = async (item, numResults, includeTotal, includeStats, includeME, includeCL, includeSS) => {
	try {
		let numGotten = 0;
		
		//Initialize lists
		let items = [];
		let prices = [];
		let shipping = [];
		let sellers = [];

		let returnItems = [];

		while (numGotten < numResults) {
			const { data } = await axios.get(
				// 'https://www.google.com/search?psb=1&tbm=shop&q=' + item
				'https://www.google.com/search?tbm=shop&q=' + item + '&hl=en&psb=1&ved=2ahUKEwiP1bX14pXyAhXjPgoDHQZTBcIQu-kFegQIABAT&start='+numGotten
			);

			// To limit frequency of requests (waits 1 second)
			delay(1000);

			const $ = cheerio.load(data);

			// Temporary lists for each round
			let newItems = [];
			let newPrices = [];
			let newShipping = [];
			let newSellers = [];
	
			// Scrape data
			$('[class=rgHvZc]').each((index, value) => {
				const itemName = $(value).text();
				newItems.push(itemName);
			});
	
			$('[class=HRLxBb]').each((index, value) => {
				const price = $(value).text();
				newPrices.push(price);
			});
	
			$('span[class=dD8iuc]').each((index, value) => {
				const shippingItem = $(value).text();
				newShipping.push(shippingItem);
			});
	
			$('div[class=dD8iuc]').each((index, value) => {
				const seller = $(value).text();
				newSellers.push(seller);
			});
	
			// Adjust num results (for the round)
			let roundNumResults = Math.min(numResults-numGotten, newItems.length, newPrices.length, newShipping.length, newSellers.length);
	
			// No more results, break
			if (roundNumResults === 0) {
				break;
			}

			// Adjust the array lengths
			newItems = newItems.slice(0, roundNumResults);
			newPrices = newPrices.slice(0, roundNumResults);
			newShipping = newShipping.slice(0, roundNumResults);
			newSellers = newSellers.slice(0, roundNumResults);
	
			// Do formatting
			for(let i = 0; i < roundNumResults; i++) {
				newPrices[i] = Number(newPrices[i].substring(1).replace(',',''));
				if (newShipping[i] === 'Free shipping') {
					newShipping[i] = 0;
				}
				else {
					newShipping[i] = Number(newShipping[i].substring(2, newShipping[i].indexOf('s')-1).replace(','));
				}
				newSellers[i] = newSellers[i].substring(newSellers[i].indexOf('from')+5)
			}
	
			// Generate return items
			for(let i = 0; i < roundNumResults; i++) {
				if (!isNaN(newPrices[i]) && !isNaN(newShipping[i])) {
					returnItems.push({
						'item' : newItems[i],
						'price' : newPrices[i],
						'shipping' : newShipping[i],
						'seller' : newSellers[i]
					});

					// Update running lists
					items.push(newItems[i]);
					prices.push(newPrices[i]);
					shipping.push(newShipping[i]);
					sellers.push(newSellers[i]);

					numGotten++;
				}
			}
		}
		
		let avgPrice;
		let avgPriceNoShipping;
		if (numGotten == 0) {
			avgPrice = 0;
			avgPriceNoShipping = 0;
		}
		else {
			let sumReducer = (a, b) => a + b;
			avgPrice = (prices.reduce(sumReducer, 0) + shipping.reduce(sumReducer, 0)) / numGotten;
			avgPriceNoShipping = prices.reduce(sumReducer, 0) / numGotten;
		}

		let pricesWithShipping = [];
		for (let i = 0; i < numGotten; i++) {
			pricesWithShipping.push(prices[i] + shipping[i]);
		}

		// DO SOME STATS
		let minPrice;
		let minPriceNoShipping;
		let maxPrice;
		let maxPriceNoShipping;
		let range;
		let rangeNoShipping;
		let median;
		let medianNoShipping;
		let stdDev;
		let stdDevNoShipping;
		let iqr;
		let iqrNoShipping;

		// Object that we're going to return
		let returnObject = {};
		returnObject.item = item;
		returnObject.numResults = numGotten;
		returnObject.avgPrice = avgPrice;
		returnObject.avgPriceNoShipping = avgPriceNoShipping;
		returnObject.itemList = returnItems;

		if (includeTotal) {
			returnObject.totalResults = await getNumResults(item);
		}

		if (includeStats) {
			minPrice = Math.min(...pricesWithShipping);
			minPriceNoShipping  = Math.min(...prices);
			maxPrice = Math.max(...pricesWithShipping);
			maxPriceNoShipping = Math.max(...prices);
			range = maxPrice - minPrice;
			rangeNoShipping = maxPriceNoShipping - minPriceNoShipping;

			// Getting median
			let middle = Math.floor(prices.length / 2);
    	let sortedNoShipping = [...prices].sort((a, b) => a - b);
			let sorted = [...pricesWithShipping].sort((a, b) => a - b);
  		if (prices.length % 2 == 0) {
				median = (sorted[middle - 1] + sorted[middle]) / 2;
				medianNoShipping = (sortedNoShipping[middle - 1] + sortedNoShipping[middle]) / 2;
			}
			else {
				median = sorted[middle];
				medianNoShipping = sortedNoShipping[middle];
			}

			// Getting std dev
			if (pricesWithShipping.length == 0) {
				stdDev = 0;
				stdDevNoShipping = 0;
			}
			else {
  			stdDev = Math.sqrt(pricesWithShipping.map(x => Math.pow(x - avgPrice, 2)).reduce((a, b) => a + b) / pricesWithShipping.length);
				stdDevNoShipping = Math.sqrt(prices.map(x => Math.pow(x - avgPriceNoShipping, 2)).reduce((a, b) => a + b) / prices.length);
			}

			// Getting iqr
			let upperRange;
			let upperRangeNoShipping;
			if (prices.length % 2 == 0) {
				upperRange = sorted.slice(middle);
				upperRangeNoShipping = sortedNoShipping.slice(middle);
			}
			else {
				upperRange = sorted.slice(middle+1);
				upperRangeNoShipping = sortedNoShipping.slice(middle+1);
			}
			let lowerRange = sorted.slice(0, middle);
			let lowerRangeNoShipping = sortedNoShipping.slice(0, middle);
			let upperRangeMiddle = Math.floor(upperRange.length / 2);
			let upperRangeNoShippingMiddle = Math.floor(upperRangeNoShipping.length / 2);
			let lowerRangeMiddle = Math.floor(lowerRange.length / 2);
			let lowerRangeNoShippingMiddle = Math.floor(lowerRangeNoShipping.length / 2);
			let q3;
			let q3NoShipping;
			let q1;
			let q1NoShipping;
			if (upperRange.length % 2 == 0) {
				q3 = (upperRange[upperRangeMiddle-1] + upperRange[upperRangeMiddle]) / 2;
				q3NoShipping = (upperRangeNoShipping[upperRangeNoShippingMiddle-1] + upperRangeNoShipping[upperRangeNoShippingMiddle]) / 2;
				q1 = (lowerRange[lowerRangeMiddle-1] + lowerRange[lowerRangeMiddle]) / 2;
				q1NoShipping = (lowerRangeNoShipping[lowerRangeNoShippingMiddle-1] + lowerRangeNoShipping[lowerRangeNoShippingMiddle]) / 2;
			}
			else {
				q3 = upperRange[upperRangeMiddle];
				q3NoShipping = upperRangeNoShipping[upperRangeNoShippingMiddle];
				q1 = lowerRange[lowerRangeMiddle];
				console.log(q3);
				console.log(q1);
				q1NoShipping = lowerRangeNoShipping[lowerRangeNoShippingMiddle];
			}
			iqr = q3 - q1;
			iqrNoShipping = q3NoShipping - q1NoShipping;

			returnObject.minPrice = Math.round(100*minPrice)/100;
			returnObject.minPriceNoShipping = Math.round(100*minPriceNoShipping)/100;
			returnObject.maxPrice = Math.round(100*maxPrice)/100;
			returnObject.maxPriceNoShipping = Math.round(100*maxPriceNoShipping)/100;
			returnObject.range = Math.round(100*range)/100;
			returnObject.rangeNoShipping = Math.round(100*rangeNoShipping)/100;
			returnObject.median = Math.round(100*median)/100;
			returnObject.medianNoShipping = Math.round(100*medianNoShipping)/100;
			returnObject.stdDev = Math.round(100*stdDev)/100;
			returnObject.stdDevNoShipping = Math.round(100*stdDevNoShipping)/100;
			returnObject.iqr = Math.round(100*iqr)/100;
			returnObject.iqrNoShipping = Math.round(100*iqrNoShipping)/100;
		}

		// So we don't repeat requests for the pop std dev
		let totalResults;
		let popStdDev;
		let popStdDevNoShipping;
		if (includeME || includeCL || includeSS) {
			if (includeTotal) {
				totalResults = returnObject.totalResults;
			}
			else {
				totalResults = await getNumResults(item);
			}
			let populationDetails = await scrapeGoogle(item, totalResults + 50, false, true, false, false, false);
			popStdDev = populationDetails.stdDev;
			popStdDevNoShipping = populationDetails.stdDevNoShipping;
			console.log("pop details: ");
			console.log(populationDetails);
		}

		if (includeME) {
			// Z score for 95% confidence level
			let z = 1.96;

			// Gonna try something super whacky to get the population std dev
			// This could be decomposed way better. I'm not gonna do that though.

			console.log("pop dev", popStdDev);
			console.log("pop dev no shipping", popStdDevNoShipping);
			console.log("sqrt numgotten", Math.sqrt(numGotten));

			returnObject.marginError = Math.round(100*((z * popStdDev) / Math.sqrt(numGotten)))/100;
			returnObject.marginErrorNoShipping = Math.round(100*((z * popStdDevNoShipping) / Math.sqrt(numGotten)))/100;
		}

		if (includeCL) {
			let zScore = 5*Math.sqrt(numGotten)/popStdDev;
			let zScoreNoShipping = 5*Math.sqrt(numGotten)/popStdDevNoShipping;
			returnObject.zScore = Math.round(100*zScore)/100;
			returnObject.zScoreNoShipping = Math.round(100*zScoreNoShipping)/100;
		}

		if (includeSS) {
			returnObject.sampleSize = Math.round(100*Math.pow((1.96*popStdDev)/5,2))/100;
			returnObject.sampleSizeNoShipping = Math.round(100*Math.pow((1.96*popStdDevNoShipping)/5,2))/100;
		}
		
		return returnObject;

	} catch (error) {
		throw error;
	}
};