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

  const nodeUrl = 'https://guarded-ridge-80100.herokuapp.com';

  //Actually sends post request to node server
  const doScraping = () => {
    setScraping(true);
    axios.post(nodeUrl + "/scrape", {
      items: fileText.split("\n"),
      numResults: numResults
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
              <DropdownButton size="lg" title={`Results: ${numResults}`} className='drop-button' variant='danger'>
                {numberOptions}
              </DropdownButton>
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
          <br/><br/>
          Please <a className="link" href="mailto:pokerrangecalculator@gmail.com">reach out</a> if you have any problems or ideas for improving the site! Ideas could be something like
          <br/><ul>
            <li>Support for CSV files for input/output</li>
            <li>Support for making searches with a different location</li>
            <li>Being able to search for more than 20 of each item</li>
            <li>A menu that lets you select which results to keep and which to drop</li>
            <li>Making this whole help section less ugly</li>
          </ul>
          Or anything else you can think of!
        </div>
        <div className="section grey" id="about">
          <div className="text-container">
            This website was built by <a className="link" href="https://www.rhett-owen.com/" target="_blank" rel="noreferrer">Rhett Owen</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
