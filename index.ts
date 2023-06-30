import { Scrapping } from "./scrapping";

async function main() {
    const scraper = new Scrapping();
    const [ container, mbl ] = process.argv.slice(2);
    await scraper.exec(container, mbl);
}

main();