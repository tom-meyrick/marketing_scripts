/*
  Stock check
  
  This Google Ads script checks the landing pages of ads for out of stock messages. 
  When a message is found, the ad is paused, a label applied and the url added to an email list. 

  The script will also check the urls of paused ads. 
  These will be re-enabled once they are back in stock. 
*/

//A list of recipients, separated by commas
const recipients = [
  "email1@email.com", "email2@email.com"
];
//This should be the message that appears on pages when an item is out of stock
let message = "eg. Out of Stock";
const regex = /(?<=com\/)(.*?)(?=\/)/;
const label = "OOS";

const extract_product_name = (url) => {
  let m = url.match(regex);
  if (m) {
    return capitalizeFirstLetter(m[0].replaceAll("-", " "));
  } else {
    return url;
  }
};

const createLabel = (name) => {
  if (
    !AdsApp.labels()
      .withCondition("Name = '" + name + "'")
      .get()
      .hasNext()
  ) {
    AdsApp.createLabel(name);
  }
};

const testUrl = (url, out_of_stock_check) => {
  const options = {
    muteHttpExceptions: true,
  };
  if (url) {
    let response = UrlFetchApp.fetch(url, options);
    let data = response.getContentText();
    if (out_of_stock_check) {
      if (data.indexOf(message) !== -1) {
        return true;
      }
    } else if (!out_of_stock_check) {
      if (data.indexOf(message) == -1) {
        return true;
      }
    }
  } else {
    Logger.log(`Can't access ${url}`);
  }
};

const pauseAds = (ads) => {
  while (ads.hasNext()) {
    let ad = ads.next();
    Logger.log(`Pausing ${extract_product_name(ad.urls().getFinalUrl())}`);
    ad.pause();
    ad.applyLabel(label);
  }
};

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const extractAds = (objArray) => {
  let ids = objArray.map((element) => {
    return [element.adgroupId, element.adId];
  });
  let ads = AdsApp.ads().withIds(ids).get();
  return ads;
};

const sendEmail = (ooS_array, iS_array) => {
  let oos_ads;
  if (ooS_array.length > 0) {
    oos_ads = extractAds(ooS_array);
  }
  let account = AdsApp.currentAccount().getName();
  let subject = "Changes to product availability in " + account;
  let body =
    "The following products are out of stock. The ads have been paused and will be enabled once they're back in stock.\r\n\n";
  while (oos_ads.hasNext()) {
    let ad = oos_ads.next();
    body +=
      extract_product_name(ad.urls().getFinalUrl()) +
      ": " +
      ad.urls().getFinalUrl() +
      " \r\n\n" +
      "Ad Group: " +
      ad.getAdGroup().getName() +
      " \r\n\n" +
      "Ad Id: " +
      ad.getId() +
      " \r\n\n";
  }
  if (iS_array.length > 0) {
    body += "These products are back in stock and have been re-enabled: \r\n\n";
    iS_array.forEach((element) => {
      body +=
        extract_product_name(element.url) +
        ": " +
        element.url +
        " \r\n\n" +
        "Ad Group: " +
        element.adGroupName +
        " \r\n\n" +
        "Ad Id: " +
        element.adId +
        " \r\n\n";
    });
  }
  MailApp.sendEmail(recipients.join(","), subject, body);
  Logger.log("Email sent to " + recipients.join(", "));
};

const enable_previously_paused_ads = (array) => {
  let inStock = [];
  let urls = array.map((element) => {
    return element.url;
  });
  let labelIterator = AdsApp.labels()
    .withCondition(`label.name = "${label}"`)
    .get();
  if (labelIterator.hasNext()) {
    const oos_label = labelIterator.next();
    let ads = oos_label.ads().get();
    Logger.log("Testing previously paused ads...");
    while (ads.hasNext()) {
      let ad = ads.next();
      let url = ad.urls().getFinalUrl();
      if (url) {
        url = url.split("?")[0];
        if (testUrl(url, false)) {
          if (!ad.isEnabled()) {
            Logger.log(
              `${extract_product_name(url)} is back in stock - enabling ad`
            );
            ad.enable();
            //Remove label function currently broken in new exp - check here for updates: https://groups.google.com/g/adwords-scripts/c/fVYgAW2cAdI
            ad.labels();
            //Calling the labels method should work as a workaround for now until the bug is fixed
            ad.removeLabel(label);
            inStock.push({
              url: url,
              adId: ad.getId(),
              adGroupName: ad.getAdGroup().getName(),
            });
          }
        }
      }
    }
  }
  return inStock;
};

const check_all_ads = () => {
  Logger.log("Extracting ads...");
  const outOfStockAds = [];
  const allUrls = [];
  const ads = AdsApp.ads()
    .withCondition("ad_group_ad.status = ENABLED")
    .withCondition("campaign.status = ENABLED")
    .get();

  while (ads.hasNext()) {
    let ad = ads.next();
    let url = ad.urls().getFinalUrl();
    if (url) {
      url = url.split("?")[0];
      let index = allUrls.findIndex((object) => {
        return object.url === url;
      });
      if (index === -1) {
        allUrls.push({
          adId: ad.getId(),
          adgroupId: ad.getAdGroup().getId(),
          url: url,
        });
      }
    }
  }

  Logger.log(
    `Found ${allUrls.length} unique urls within this account. Checking...`
  );

  allUrls.forEach((obj) => {
    if (testUrl(obj.url, true)) {
      outOfStockAds.push(obj);
    }
  });

  if (outOfStockAds.length > 0) {
    Logger.log(
      `${outOfStockAds.length} out of stock urls found. Pausing ads and preparing emails...`
    );
    pauseAds(extractAds(outOfStockAds));
    return outOfStockAds;
  } else {
    Logger.log("No out of stock products found");
    return [];
  }
};

function main() {
  createLabel(label);
  let out_of_stock_ads = check_all_ads();
  let in_stock_ads = enable_previously_paused_ads(out_of_stock_ads);
  if (out_of_stock_ads.length > 0 || in_stock_ads.length > 0) {
    if (recipients.length > 0) {
      sendEmail(out_of_stock_ads, in_stock_ads);
    }
  }
}
