import puppeteer from 'puppeteer'

const url = 'https://www.mercadolivre.com.br/'
const searchFor = 'Macbook AIR 15'

let p = 1
let c = 1
let totalLinks = 0

const list = []

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

;(async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  console.log('Iniciando...')

  await page.goto(url)
  console.log('Fui para a página!')

  await page.waitForSelector('#cb1-edit')

  await page.type('#cb1-edit', searchFor)

  await Promise.all([page.waitForNavigation(), page.click('.nav-icon-search')])

  const totalPages = await page.evaluate(() => {
    const pages = Array.from(
      document.querySelectorAll('.andes-pagination__button a')
    )
      .map((el) => parseInt(el.textContent))
      .filter((num) => !isNaN(num))
    return Math.max(...pages)
  })

  console.log(`Total de páginas: ${totalPages}`)

  while (c <= totalPages) {
    await page.waitForSelector(
      '.ui-search-item__group.ui-search-item__group--title a'
    )

    const links = await page.$$eval(
      '.ui-search-item__group.ui-search-item__group--title a',
      (elements) => {
        return elements.map((element) => element.href)
      }
    )

    totalLinks += links.length

    console.log(
      `Encontrados ${links.length} links na página ${c} com um total de ${totalLinks} links em todas as páginas`
    )

    for (const link of links) {
      console.log('Produto', p)
      await page.goto(link)

      await page.waitForSelector('.ui-pdp-title')

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
      console.log(`Adicionando o produto ${p}:`, object)

      p++

      await sleep(10000)

      await page.goBack()

      await page.waitForSelector(
        '.ui-search-item__group.ui-search-item__group--title a'
      )
    }

    if (c < totalPages) {
      await Promise.all([
        page.waitForNavigation(),
        page.click(
          '.andes-pagination__button.andes-pagination__button--next a'
        ),
      ])
      c++
    } else {
      break
    }
  }

  console.log('Total de itens:', list.length)
  console.log('Itens:', list)

  await browser.close()
})()
