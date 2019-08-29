const puppeteer = require('puppeteer');
const $ = require('cheerio');
const colors = require('colors');

/*
1. Go to https://sis.rutgers.edu/soc/#home and search for your class.
2. Put that link in url variable
3. Input the rest of your information.
4. Run with node "app.js"
*/
const sectionNumbers = [02,04,06,05,03]; //enter section numbers here
const sectionIndexNumbers = ['09922','02561','15067','09490','04541']; //enter 5 digit course code here
const NETID = ''; //enter netID
const PASSWORD = ''; //enter PSWD
const classID = '01:198:213' // enter course ID in form xx:xxx:xxx here
const delayBetweenChecks = 2000; //milliseconds


function ClassesToRegister(url, sectionNumbers, sectionIndexNumbers) {
  this.url = url;
  this.sectionNumbers = sectionNumbers;
  this.sectionIndexNumbers = sectionIndexNumbers;
}

function generateURL() {
  return "https://sis.rutgers.edu/soc/#keyword?keyword=" + classID + "&semester=92019&campus=NB&level=U";
}

function start() {
  if (sectionNumbers.length != sectionIndexNumbers.length) {
    console.log("incorrect inputs");
    return;
  }
  var classToRegister = new ClassesToRegister(generateURL(), sectionNumbers, sectionIndexNumbers);
  getScheduleInfo(classToRegister);
}


//go to course schedule planner
function getScheduleInfo(course) {

  try {
    puppeteer.launch({
      headless: true
    }).then(async browser => {

	var bodyHTML = null;

      var schedulePage = await browser.newPage();


      do {
        try {

          if(bodyHTML==null){
          await schedulePage.goto(course.url, {
            waitUntil: 'networkidle2'
          });
        }
        else{
          await schedulePage.reload();
        }

          bodyHTML = await schedulePage.evaluate(() => document.body.outerHTML);
        } catch (e) {
          console.log(e);
        }
        await sleep(delayBetweenChecks);
        var status = await checkAndRegister(bodyHTML, course);
      } while (status == false);

      await browser.close();


    });
  } catch (e) {
    console.log(e);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeTimeoutFunc(param) {
  return function() {
    // does something with param
  }
}

function saveToFile(item) {
  const fs = require('fs');
  fs.writeFile("debug.html", item, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });
}

function checkAndRegister(html, course) {


  var gotClass = false;
  var indexNum = 0;
  if (html === null) {
    return gotClass;
  }
  
  var found = false;
  //iterate through all open classes
  $('.sectionopen', html).each(function() {
	for(var x = 0; x < sectionNumbers.length; x++){
		if ($(this).text() == course.sectionNumbers[x]) {
			found = true;
			indexNum = x;
			console.log(course.sectionIndexNumbers[x] + " is open. Attempting to register.  ".green);
			break;
		}
	}
    if (found) {
      //go to webreg and attempt registeration
      try {
        puppeteer.launch({
          headless: true
        }).then(async browser => {
          var registerPage = await browser.newPage();

          await registerPage.goto('https://sims.rutgers.edu/webreg/', {
            waitUntil: 'networkidle2'
          });
          //this sequence starts at webreg landing page and ends at registration.
          await registerPage.evaluate(() => {[]
            document.querySelectorAll('a')[0].click();
          }, {
            waitUntil: 'networkidle2'
          });

          await registerPage.waitForNavigation();
          await registerPage.focus('#username');
          await registerPage.keyboard.type(NETID);
          await registerPage.focus('#password');
          await registerPage.keyboard.type(PASSWORD);
          //console.log(0);
          await registerPage.click('#fm1 > fieldset > div:nth-child(7) > input.btn-submit');

          //choose semester
          try {
            await registerPage.waitForSelector('#wr > div');
            await registerPage.click("#wr > div");
          } catch (e) {
            console.log("Failed to log in. netid/ password is incorrect.");
          }

          await registerPage.waitForSelector('#i1');
          await registerPage.focus('#i1');
          await registerPage.keyboard.type(course.sectionIndexNumbers[indexNum]);
          await registerPage.waitFor(300);
          await registerPage.click('#submit');
          await registerPage.waitFor(30000);

          var text = null;
          try {
            text = await registerPage.evaluate(() => document.querySelector('.ok').textContent);
          } catch (e) {
            try {
              text = await registerPage.evaluate(() => document.querySelector('.error').textContent);
            } catch (e) {
              console.log(e);
              console.log("Class already closed or page timed out.");
            }
          }
          console.log(text);

          if (text.includes("success") || text.includes("You are already registered for course ")) {
            console.log(("Successfully registered for " + course.sectionIndexNumbers[indexNum] + ". Shutting down...   " + new Date(Date.now()).toLocaleString()).green);
            await registerPage.close();
            gotClass=true;
            await browser.close();
			return process.exit(1);
          }
          else{
            console.log(("Registeration error occurred for " + course.sectionIndexNumbers[indexNum] + ". Retrying...   " + new Date(Date.now()).toLocaleString()).blue);
            await registerPage.close();
            await browser.close();
          }
        });
      } catch (error) {
        console.log(error);
      }
    }
  });
console.log(("No classes open. Retrying...   " + " ").red + new Date(Date.now()).toLocaleString());
  return gotClass;
}
start();