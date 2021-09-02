import React, {
  useState,
} from 'react';
import axios from 'axios';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Collapse from 'react-bootstrap/Collapse';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import Spinner from 'react-bootstrap/Spinner';
// import InputGroup from 'react-bootstrap/InputGroup';
// import { PayPalButton } from "react-paypal-button-v2";
// import Paypal from "./Components/Paypal";

import './App.css';

//Bootstrap styles
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {

  const [fileText, setFileText] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [numResults, setNumResults] = useState(3);
  const [returnData, setReturnData] = useState(null);
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [includeTotal, setIncludeTotal] = useState(false);

  const nodeUrl = 'https://guarded-ridge-80100.herokuapp.com';
  // const nodeUrl = 'http://localhost:8080';

  //Actually sends post request to node server
  const doScraping = () => {
    setScraping(true);
    axios.post(nodeUrl + "/scrape", {
      items: fileText.split("\n"),
      numResults: numResults,
      includeTotal: includeTotal
    }).then(
      function(value) {
        setReturnData(value.data);
        setScraping(false);
      },
      function(error) {
        setScraping(false);
        alert(error + "\nPlease try again.");
      }
    );
  }

  //Formats object as a string and downloads as a txt file
  const downloadResults = () => {
    let returnString = "";
    for (let chunk of returnData) {
      if(chunk.value.item === "") {
        continue;
      }
      returnString += "Item: " + chunk.value.item + "\n";
      returnString += "Total number of Google Shopping Results: " + chunk.value.totalResults + "\n";
      if (chunk.value.numResults < numResults) {
        returnString += "Was only able to find " + chunk.value.numResults + " instead of " + numResults + "\n";
      }
      returnString += "Average price (including shipping): $" + Math.round(100*chunk.value.avgPrice)/100 + "\n";
      returnString += "Average price (excluding shipping): $" + Math.round(100*chunk.value.avgPriceNoShipping)/100 + "\n\n";
      for (let i = 0; i < chunk.value.numResults; i++) {
        returnString += "Item " + parseInt(i+1) + ": " + chunk.value.itemList[i].item + "\n";
        returnString += "Seller: " + chunk.value.itemList[i].seller + "\n";
        returnString += "Price: $" + chunk.value.itemList[i].price + "\n";
        returnString += "Shipping: $" + chunk.value.itemList[i].shipping + "\n";
        let priceWithShippping = parseFloat(chunk.value.itemList[i].shipping) + parseFloat(chunk.value.itemList[i].price);
        returnString += "Price (with shipping): $" + Math.round(100*priceWithShippping)/100 + "\n\n";
      }
      returnString += "\n";
    }

    const element = document.createElement("a");
    const file = new Blob([returnString], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "costedItems.txt";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  }

  //Reads input file and sets file text based on it
  const readFile = (e) => {
    if(!!returnData) {
      setReturnData(null);
    }
    var reader = new FileReader();
    setFileUploadLoading(true);
    reader.onload = async (e) => {
      setFileText(e.target.result);
      setFileUploadLoading(false);
    };
  
    if(e.target.files.length > 0) {
      reader.readAsText(e.target.files[0]);
    }
    else {
      setFileUploadLoading(false);
      setFileText('');
    }
  }

  let numberOptions = [...Array(20).keys()].map((number) => {
    return (
      <Dropdown.Item 
        active={numResults === number + 1} 
        onClick={() => setNumResults(number + 1)}
        key={number + 1}
      >
        {number + 1}
      </Dropdown.Item>
    )
  });

  const handleCustomInput = (e) => {
    if(!!returnData) {
      setReturnData(null);
    }
    setFileText(e.target.value);
  }

  return (
    <div>
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#home">Costing Helper</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link href="#help">Help</Nav.Link>
            <Nav.Link href="#about">About</Nav.Link>
          </Nav>
        </Container>
      </Navbar>
      <div className="section grey bottom-padding">
        <div className="upload">
          <Form.Group controlId="formFileLg" className="mb-3">
            <Form.Label>Choose a .txt file</Form.Label>
            <Form.Control 
              type="file" 
              size="lg" 
              onChange={(e) => readFile(e)}
              accept=".txt"
              />
          </Form.Group>
          {
            fileUploadLoading ? 
              <Spinner animation="border" variant="danger" />
            :
              <div/>
          }
          <div id="or">Or</div>
          <Button variant="danger" size="lg" onClick={() => setCustomOpen(!customOpen)}>Custom input</Button>
          <Collapse in={customOpen}>
            <Form.Group controlId="input-box">
              <Form.Label>Enter items here (one per line)</Form.Label>
              <Form.Control as="textarea" rows={3} value={fileText} onChange={(e) => handleCustomInput(e)}/>
            </Form.Group>
          </Collapse>
          {
            !!fileText ?
            <React.Fragment>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <DropdownButton size="lg" title={`Results: ${numResults}`} className='drop-button' variant='secondary'>
                  {numberOptions}
                </DropdownButton>
                <Button variant="secondary" size="lg" onClick={() => setAdvancedOpen(!advancedOpen)} style={{marginTop: '1.75rem'}}>Advanced</Button>
                <Collapse in={advancedOpen} aria-controls="example-collapse-text">
                  <div>
                    <div id="example-collapse-text" style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                      <input type="checkbox" value={includeTotal} onChange={() => setIncludeTotal(!includeTotal)} style={{marginLeft: '1rem', marginRight: '0.2rem', marginTop: '1.75rem'}}/>
                      <div style={{marginTop: '1.75rem'}}>Find the number of Google Shopping results for each item</div>
                    </div>
                  </div>
                </Collapse>
              </div>
              {
                scraping ?
                  <Spinner animation="border" variant="danger" style={{marginTop: '2rem'}}/>
                :
                  <React.Fragment>
                    {
                      !!returnData ?
                        <Button variant="danger" size="lg" id="go-button" onClick={() => downloadResults()}>Download Results</Button>
                      :
                        <Button variant="danger" size="lg" id="go-button" onClick={() => doScraping()}>Go!</Button>
                    }
                  </React.Fragment>
              }
            </React.Fragment>
            :
            <div/>
          }
        </div>
      </div>
      <div className="section black" id="help">
        <div className="text-container">
          <div style={{fontSize: '3rem'}}>Welcome to Costing Helper!</div><br/>
          Costing Helper is a tool that lets you cost items faster by automatically searching Google Shopping.
          <br/>The steps are super simple:<br/><br/>
          <ol>
            <li>Upload a file with your items listed 1 per line (or type them in the custom input box)</li>
            <li>Choose the number of each item you would like to include in the report</li>
            <li>Hit 'Go!'</li>
            <li>Download the text file with your results</li>
          </ol>
          <br/>
          Since this site is making requests to Google Shopping, any variability in Google Shopping results will affect 
          the results you receive through Costing Helper. For example, Google Shopping may return different items for the 
          same search, or requests to Google Shopping may fail completely. Also, searches are made with the location of 
          Virginia, since that is where the server is located, so this should be the location that shipping prices are based on. 
          Unfortunately, there is currently no way to make requests from a different location.
          <br/>
          <br/>
          Please <a className="link" href="mailto:pokerrangecalculator@gmail.com">reach out</a> if you have any problems or ideas for improving the site! Ideas could be something like
          <br/><ul>
            <li>Support for CSV files for input/output</li>
            <li>Being able to search for more than 20 of each item</li>
            <li>A menu that lets you select which results to keep and which to drop</li>
            <li>Making this whole help section less ugly</li>
          </ul>
          Or anything else you can think of!
        </div>
        <div className="section grey" id="about">
          <div className="text-container">
            This website was built by <a className="link" href="https://www.rhett-owen.com/" target="_blank" rel="noreferrer">Rhett Owen</a>. <br/><br/>
            I'm a college student and I make websites like this one for fun. I don't get paid for these, so if you found this website helpful and want to support me, please consider donating! 
          </div>
          <a className="link" target="_blank" rel="noreferrer" href="https://www.paypal.com/donate?token=CIQq6ZbiZWgG6WH3oOXM6bWYu3fQkjEYgq2LFOpVBNKLRzuru1NIvJ5LpY7YapDkRYZdnkAWCzqjz_u1">
            <div id="paypal-button">
              <img id="paypal-logo" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAxcHgiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAxMDEgMzIiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaW5ZTWluIG1lZXQiIHhtbG5zPSJodHRwOiYjeDJGOyYjeDJGO3d3dy53My5vcmcmI3gyRjsyMDAwJiN4MkY7c3ZnIj48cGF0aCBmaWxsPSIjMDAzMDg3IiBkPSJNIDEyLjIzNyAyLjggTCA0LjQzNyAyLjggQyAzLjkzNyAyLjggMy40MzcgMy4yIDMuMzM3IDMuNyBMIDAuMjM3IDIzLjcgQyAwLjEzNyAyNC4xIDAuNDM3IDI0LjQgMC44MzcgMjQuNCBMIDQuNTM3IDI0LjQgQyA1LjAzNyAyNC40IDUuNTM3IDI0IDUuNjM3IDIzLjUgTCA2LjQzNyAxOC4xIEMgNi41MzcgMTcuNiA2LjkzNyAxNy4yIDcuNTM3IDE3LjIgTCAxMC4wMzcgMTcuMiBDIDE1LjEzNyAxNy4yIDE4LjEzNyAxNC43IDE4LjkzNyA5LjggQyAxOS4yMzcgNy43IDE4LjkzNyA2IDE3LjkzNyA0LjggQyAxNi44MzcgMy41IDE0LjgzNyAyLjggMTIuMjM3IDIuOCBaIE0gMTMuMTM3IDEwLjEgQyAxMi43MzcgMTIuOSAxMC41MzcgMTIuOSA4LjUzNyAxMi45IEwgNy4zMzcgMTIuOSBMIDguMTM3IDcuNyBDIDguMTM3IDcuNCA4LjQzNyA3LjIgOC43MzcgNy4yIEwgOS4yMzcgNy4yIEMgMTAuNjM3IDcuMiAxMS45MzcgNy4yIDEyLjYzNyA4IEMgMTMuMTM3IDguNCAxMy4zMzcgOS4xIDEzLjEzNyAxMC4xIFoiPjwvcGF0aD48cGF0aCBmaWxsPSIjMDAzMDg3IiBkPSJNIDM1LjQzNyAxMCBMIDMxLjczNyAxMCBDIDMxLjQzNyAxMCAzMS4xMzcgMTAuMiAzMS4xMzcgMTAuNSBMIDMwLjkzNyAxMS41IEwgMzAuNjM3IDExLjEgQyAyOS44MzcgOS45IDI4LjAzNyA5LjUgMjYuMjM3IDkuNSBDIDIyLjEzNyA5LjUgMTguNjM3IDEyLjYgMTcuOTM3IDE3IEMgMTcuNTM3IDE5LjIgMTguMDM3IDIxLjMgMTkuMzM3IDIyLjcgQyAyMC40MzcgMjQgMjIuMTM3IDI0LjYgMjQuMDM3IDI0LjYgQyAyNy4zMzcgMjQuNiAyOS4yMzcgMjIuNSAyOS4yMzcgMjIuNSBMIDI5LjAzNyAyMy41IEMgMjguOTM3IDIzLjkgMjkuMjM3IDI0LjMgMjkuNjM3IDI0LjMgTCAzMy4wMzcgMjQuMyBDIDMzLjUzNyAyNC4zIDM0LjAzNyAyMy45IDM0LjEzNyAyMy40IEwgMzYuMTM3IDEwLjYgQyAzNi4yMzcgMTAuNCAzNS44MzcgMTAgMzUuNDM3IDEwIFogTSAzMC4zMzcgMTcuMiBDIDI5LjkzNyAxOS4zIDI4LjMzNyAyMC44IDI2LjEzNyAyMC44IEMgMjUuMDM3IDIwLjggMjQuMjM3IDIwLjUgMjMuNjM3IDE5LjggQyAyMy4wMzcgMTkuMSAyMi44MzcgMTguMiAyMy4wMzcgMTcuMiBDIDIzLjMzNyAxNS4xIDI1LjEzNyAxMy42IDI3LjIzNyAxMy42IEMgMjguMzM3IDEzLjYgMjkuMTM3IDE0IDI5LjczNyAxNC42IEMgMzAuMjM3IDE1LjMgMzAuNDM3IDE2LjIgMzAuMzM3IDE3LjIgWiI+PC9wYXRoPjxwYXRoIGZpbGw9IiMwMDMwODciIGQ9Ik0gNTUuMzM3IDEwIEwgNTEuNjM3IDEwIEMgNTEuMjM3IDEwIDUwLjkzNyAxMC4yIDUwLjczNyAxMC41IEwgNDUuNTM3IDE4LjEgTCA0My4zMzcgMTAuOCBDIDQzLjIzNyAxMC4zIDQyLjczNyAxMCA0Mi4zMzcgMTAgTCAzOC42MzcgMTAgQyAzOC4yMzcgMTAgMzcuODM3IDEwLjQgMzguMDM3IDEwLjkgTCA0Mi4xMzcgMjMgTCAzOC4yMzcgMjguNCBDIDM3LjkzNyAyOC44IDM4LjIzNyAyOS40IDM4LjczNyAyOS40IEwgNDIuNDM3IDI5LjQgQyA0Mi44MzcgMjkuNCA0My4xMzcgMjkuMiA0My4zMzcgMjguOSBMIDU1LjgzNyAxMC45IEMgNTYuMTM3IDEwLjYgNTUuODM3IDEwIDU1LjMzNyAxMCBaIj48L3BhdGg+PHBhdGggZmlsbD0iIzAwOWNkZSIgZD0iTSA2Ny43MzcgMi44IEwgNTkuOTM3IDIuOCBDIDU5LjQzNyAyLjggNTguOTM3IDMuMiA1OC44MzcgMy43IEwgNTUuNzM3IDIzLjYgQyA1NS42MzcgMjQgNTUuOTM3IDI0LjMgNTYuMzM3IDI0LjMgTCA2MC4zMzcgMjQuMyBDIDYwLjczNyAyNC4zIDYxLjAzNyAyNCA2MS4wMzcgMjMuNyBMIDYxLjkzNyAxOCBDIDYyLjAzNyAxNy41IDYyLjQzNyAxNy4xIDYzLjAzNyAxNy4xIEwgNjUuNTM3IDE3LjEgQyA3MC42MzcgMTcuMSA3My42MzcgMTQuNiA3NC40MzcgOS43IEMgNzQuNzM3IDcuNiA3NC40MzcgNS45IDczLjQzNyA0LjcgQyA3Mi4yMzcgMy41IDcwLjMzNyAyLjggNjcuNzM3IDIuOCBaIE0gNjguNjM3IDEwLjEgQyA2OC4yMzcgMTIuOSA2Ni4wMzcgMTIuOSA2NC4wMzcgMTIuOSBMIDYyLjgzNyAxMi45IEwgNjMuNjM3IDcuNyBDIDYzLjYzNyA3LjQgNjMuOTM3IDcuMiA2NC4yMzcgNy4yIEwgNjQuNzM3IDcuMiBDIDY2LjEzNyA3LjIgNjcuNDM3IDcuMiA2OC4xMzcgOCBDIDY4LjYzNyA4LjQgNjguNzM3IDkuMSA2OC42MzcgMTAuMSBaIj48L3BhdGg+PHBhdGggZmlsbD0iIzAwOWNkZSIgZD0iTSA5MC45MzcgMTAgTCA4Ny4yMzcgMTAgQyA4Ni45MzcgMTAgODYuNjM3IDEwLjIgODYuNjM3IDEwLjUgTCA4Ni40MzcgMTEuNSBMIDg2LjEzNyAxMS4xIEMgODUuMzM3IDkuOSA4My41MzcgOS41IDgxLjczNyA5LjUgQyA3Ny42MzcgOS41IDc0LjEzNyAxMi42IDczLjQzNyAxNyBDIDczLjAzNyAxOS4yIDczLjUzNyAyMS4zIDc0LjgzNyAyMi43IEMgNzUuOTM3IDI0IDc3LjYzNyAyNC42IDc5LjUzNyAyNC42IEMgODIuODM3IDI0LjYgODQuNzM3IDIyLjUgODQuNzM3IDIyLjUgTCA4NC41MzcgMjMuNSBDIDg0LjQzNyAyMy45IDg0LjczNyAyNC4zIDg1LjEzNyAyNC4zIEwgODguNTM3IDI0LjMgQyA4OS4wMzcgMjQuMyA4OS41MzcgMjMuOSA4OS42MzcgMjMuNCBMIDkxLjYzNyAxMC42IEMgOTEuNjM3IDEwLjQgOTEuMzM3IDEwIDkwLjkzNyAxMCBaIE0gODUuNzM3IDE3LjIgQyA4NS4zMzcgMTkuMyA4My43MzcgMjAuOCA4MS41MzcgMjAuOCBDIDgwLjQzNyAyMC44IDc5LjYzNyAyMC41IDc5LjAzNyAxOS44IEMgNzguNDM3IDE5LjEgNzguMjM3IDE4LjIgNzguNDM3IDE3LjIgQyA3OC43MzcgMTUuMSA4MC41MzcgMTMuNiA4Mi42MzcgMTMuNiBDIDgzLjczNyAxMy42IDg0LjUzNyAxNCA4NS4xMzcgMTQuNiBDIDg1LjczNyAxNS4zIDg1LjkzNyAxNi4yIDg1LjczNyAxNy4yIFoiPjwvcGF0aD48cGF0aCBmaWxsPSIjMDA5Y2RlIiBkPSJNIDk1LjMzNyAzLjMgTCA5Mi4xMzcgMjMuNiBDIDkyLjAzNyAyNCA5Mi4zMzcgMjQuMyA5Mi43MzcgMjQuMyBMIDk1LjkzNyAyNC4zIEMgOTYuNDM3IDI0LjMgOTYuOTM3IDIzLjkgOTcuMDM3IDIzLjQgTCAxMDAuMjM3IDMuNSBDIDEwMC4zMzcgMy4xIDEwMC4wMzcgMi44IDk5LjYzNyAyLjggTCA5Ni4wMzcgMi44IEMgOTUuNjM3IDIuOCA5NS40MzcgMyA5NS4zMzcgMy4zIFoiPjwvcGF0aD48L3N2Zz4" alt=""></img>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
