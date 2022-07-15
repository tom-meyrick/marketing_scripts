/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

/*
   This script is designed to verify the existence of/return the contents of an on-page element. 
   It utilises Puppeteer to create a headless Chrome instance. 
   It's designed to work with UrlFetchApp and accepts a payload JSON containing a url and a selector.
*/
 exports.scrape_page = (req, res) => {
    const puppeteer = require('puppeteer'); 
           (async() => {
          let url = req.body.url;
          let selector = req.body.selector;
          try {
          const browser = await puppeteer.launch({args: ['--no-sandbox']});
          const page = await browser.newPage();
           await page.goto(url, {waitUntil: 'networkidle0'});
          let response = (await page.evaluate(() => {
              return document.querySelector(selector);
            }));
          console.log(response);
          await browser.close();
              res.status(200).send(response);    
          process.exit();
          } catch(e) {
            res.send(e);
          }
      })();
        };
      
    
