import puppeteer from 'puppeteer'

const url = 'https://www.mercadolivre.com.br/'
const searchFor = 'Macbook'

let c = 1

const list = []

;(async () => {
  // headless: false para que o navegador não fique oculto
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  console.log('Iniciei')

  await page.goto(url)
  console.log('Fui para a página')

  await page.waitForSelector('#cb1-edit')

  await page.type('#cb1-edit', searchFor)

  await Promise.all([page.waitForNavigation(), page.click('.nav-icon-search')])

  // $$eval simula o QuerySelectorAll para retornar todos os elementos
  const links = await page.$$eval(
    '.ui-search-item__group.ui-search-item__group--title a',
    (elements) => {
      return elements.map((element) => element.href)
    }
  )

  for (const link of links) {
    console.log('Página', c)
    await page.goto(link)

    // Irá carregar até esperar o título, sem precisar carregar toda página
    await page.waitForSelector('.ui-pdp-title')

    // $eval simula o QuerySelector para retornar somente um elemento
    const title = await page.$eval(
      '.ui-pdp-title',
      (element) => element.innerText
    )

    const old_price = await page.$eval(
      '.andes-money-amount__fraction',
      (element) => element.innerText
    )

    const new_price = await page.evaluate((oldPrice) => {
      const element = document.querySelector(
        '.ui-pdp-price__second-line [data-testid="price-part"] .andes-money-amount__fraction'
      )

      if (!element) {
        return null
      } else if (element.innerText === oldPrice) {
        return null
      } else {
        return element.innerText
      }
    }, old_price)

    const discount_percentage = await page.evaluate(() => {
      const element = document.querySelector(
        '.ui-pdp-price__second-line .andes-money-amount__discount'
      )
      if (!element) {
        return null
      } else {
        return element.innerText
      }
    })

    const seller = await page.evaluate(() => {
      const element = document.querySelector('#seller')
      if (!element) {
        return null
      } else {
        return element.innerText
      }
    })

    const object = {
      title,
      old_price,
      new_price,
      discount_percentage,
      seller,
      link,
    }

    list.push(object)

    c++
  }

  console.log(list)

  await browser.close()
})()
