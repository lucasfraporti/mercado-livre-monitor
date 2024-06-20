import puppeteer from 'puppeteer'

const url = 'https://www.mercadolivre.com.br/'
const searchFor = 'Celular Wi-Fi Relógio Adaptador Carter'

let p = 1
let c = 1
let totalLinks = 0

const list = []

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const state = {
  allProducts: '',
}

const stateProxy = new Proxy(state, {
  set(target, property, value) {
    if (property === 'allProducts' && target[property] !== value) {
      if (target[property].length > 0) {
        console.log(
          `Alteração na quantidade de itens: "${target[property]}" -> "${value}"`
        )
      }
    }
    target[property] = value
    return true
  },
})

;(async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  console.log('Iniciei')

  await page.goto(url)
  console.log('Fui para a página')

  await page.waitForSelector('#cb1-edit')

  await page.type('#cb1-edit', searchFor)

  await Promise.all([page.waitForNavigation(), page.click('.nav-icon-search')])

  while (true) {
    await page.waitForSelector(
      '.ui-search-item__group.ui-search-item__group--title a'
    )

    const links = await page.$$eval(
      '.ui-search-item__group.ui-search-item__group--title a',
      (elements) => {
        return elements
          .map((element) => element.href)
          .filter((href) => !href.includes('https://loja.mercadolivre.com.br/'))
      }
    )

    console.log(links)

    totalLinks += links.length

    console.log(
      `Encontrados ${links.length} links na página ${c}, com um total de ${totalLinks} links somadas todas as páginas`
    )

    for (const link of links) {
      // if (p === 5) continue

      console.log('Produto', p)
      await page.goto(link)

      try {
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
        // console.log(`Adicionando o produto ${p}:`, object)

        p++
      } catch (error) {
        console.error(`Erro ao processar o link ${link}:`, error)
      }

      await page.goBack()
      await sleep(5000)

      await page.waitForSelector(
        '.ui-search-item__group.ui-search-item__group--title a'
      )
    }

    const nextButton = await page.$('.andes-pagination__button--next a')
    if (nextButton) {
      const buttonText = await page.evaluate(
        (element) => element.innerText,
        nextButton
      )
      if (buttonText.includes('Seguinte')) {
        await page.waitForSelector('.andes-pagination__button--next a', {
          visible: true,
        })
        await Promise.all([page.waitForNavigation(), nextButton.click()])
        c++
      } else {
        console.log('Não há mais páginas para navegar.')
        break
      }
    } else {
      console.log('Não há mais páginas para navegar.')
      break
    }
  }

  console.log('Total de produtos encontrados:', list.length)
  console.log('Produtos encontrados:', list)

  console.log(
    'Começando a verificação da disponibilidade dos produtos de 20 em 20 segundos...'
  )
  const monitorAllProducts = async () => {
    await page.reload()
    await page.waitForSelector('.ui-search-search-result')
    stateProxy.allProducts = await page.$eval(
      '.ui-search-search-result',
      (element) => element.innerText
    )
    console.log(stateProxy.allProducts)
  }

  setInterval(monitorAllProducts, 20000)

  // await browser.close()
})()
