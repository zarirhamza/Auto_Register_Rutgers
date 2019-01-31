const puppeteer = require('puppeteer');
const $ = require('cheerio');
const colors = require('colors');

const userName = 'ENTER USERNAME HERE';
const passWord = 'ENTER PASSWORD HERE';
const courseCode = 'ENTER 5 DIGIT COURSE CODE HERE';
const sectionNumber = 'ENTER 2 CHARACTER SECTION NUMBER HERE';

const USERNAME_SELECTOR = '#username';
const PASSWORD_SELECTOR = '#password';
const BUTTON_SELECTOR_LOGIN = '#fm1 > fieldset > div:nth-child(7) > input.btn-submit';
const BUTTON_SELECTOR_SEMESTER = '#submit';
const COURSENUMBER_SELECTOR = '#i1';
const BUTTON_SELECTOR_REGISTER = '#submit';
	
function main(){
		registerClass();
}

async function registerClass(){
	try{
	  var done = false;
	  const browser = await puppeteer.launch({headless: true});
	  const page = await browser.newPage();
	  await page.goto('ENTER SPECIFIC URL LINK HERE FROM RUTGERS COURSE SCHEDULE', {waitUntil: 'networkidle0'});  
	  const bodyHTML = await page.content();
	  $('.sectionopen',bodyHTML).each(async function() {
		if ($(this).text() == sectionNumber) {
			console.log("Class ".green + sectionNumber.green +  " is open. Attempting to register. ".green); 
			
			done = true;
			
			const reg = await puppeteer.launch({headless: false});
			const regPage = await reg.newPage();
			await regPage.goto('https://sims.rutgers.edu/webreg/chooseSemester.htm?login=cas', {waitUntil: 'networkidle2'});
			
			//username
			await regPage.click(USERNAME_SELECTOR);
			await regPage.keyboard.type(userName);
			
			//password
			await regPage.click(PASSWORD_SELECTOR);
			await regPage.keyboard.type(passWord);

			//login and wait
			await regPage.click(BUTTON_SELECTOR_LOGIN);
			await regPage.waitForNavigation();
			
			//select semester and wait
			await regPage.click(BUTTON_SELECTOR_SEMESTER);
			await regPage.waitForNavigation();
			
			//type coursecode
			await regPage.click(COURSENUMBER_SELECTOR);
			await regPage.keyboard.type(courseCode);
			
			//register
			await regPage.click(BUTTON_SELECTOR_REGISTER);
			await regPage.waitForNavigation();
			
			try {
			  var text = await regPage.evaluate(() => document.querySelector('.ok').textContent);
			  console.log(text);
			  if (text === "1 course(s) added successfully.") {
				console.log("Successfully registered. Shutting down...".green);
				await reg.close();
			  }

			} catch (error) {
			  try {
				console.log(await regPage.evaluate(() => document.querySelector('.error').textContent) + " Retrying...".purple);
			  } catch (err) {
				console.log("Course registeration error occured. Retrying...".red);
			  }
			  console.log("Course registeration error occured. Retrying...".red);
			  await reg.close();
			}
		}
		
	  });
	  await browser.close();
	}
	catch(problem){
		console.log(problem);
	}
  if(done == false){
	console.log('Class not open'.red);
	setTimeout(registerClass, 1000);
  }
	 
};
main();