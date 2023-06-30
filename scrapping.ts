import * as fs from "fs";
import puppeteer, { Browser } from "puppeteer";

export class Scrapping {
    async exec(container: string, mbl: string) {
        const browser: Browser = await puppeteer.launch();

        const page = await browser.newPage();
        await page.goto(`https://www.dbschenker.com/app/tracking-public/?refNumber=${mbl}`);
        await page.waitForSelector('.container-lg');
 
        const result = await page.evaluate((container) => {
            const vesselsCollapse = document.querySelector("[data-test='vessels_label'] span") as HTMLElement;
            const otherReferencesCollapse = document.querySelector("[data-test='other_references_label'] span") as HTMLElement;
            const shipmentHistoryCollapse = document.querySelector("[data-test='shipment_status_history_label'] span") as HTMLElement;
            const contactInfoCollapse = document.querySelector("[data-test='contact_information_label'] span") as HTMLElement;

            vesselsCollapse.click();
            otherReferencesCollapse.click();
            shipmentHistoryCollapse.click();
            contactInfoCollapse.click();

            return new Promise(resolve => {
                setTimeout(() => {
                    const shipmentInformation = Array.from(document.querySelectorAll('.tracking-details-value'))
                        .map(element => element.textContent.trim());

                    const [ vesselName ] = Array.from(document.querySelectorAll("td[data-test*='vessels']"))
                        .map(el => el.textContent.trim());

                    const shipmentHistorySection = Array.from(document.querySelectorAll("td[data-test*='shipment_status_history']"))
                        .map(el => el.textContent.trim());

                    let events: Array<Record<string, string>> = [];
                    let existsContainer = false;
                    shipmentHistorySection.forEach((item, index) => {
                        if (item === container) {
                            existsContainer = true;
                        }

                        const idx = index + 1;
                        if (idx % 4 === 0) {
                            events.push({
                                event: shipmentHistorySection[index - 3],
                                date: shipmentHistorySection[index - 2],
                                location: shipmentHistorySection[index - 1],
                                comments: shipmentHistorySection[index],
                            });
                        }
                    });
            
                    const data = {
                        normalized: {
                            vessels: [ vesselName ],
                            arrival: {
                                date: shipmentInformation[5],
                                location: shipmentInformation[3],
                                vessels: vesselName
                            }
                        },
                        raw: {
                            shipmentdetails: {
                                departure: shipmentInformation[0],
                                scheduleddeparture: shipmentInformation[1],
                                reviseddeparture: shipmentInformation[2],
                                destination: shipmentInformation[3],
                                scheduledarrival: shipmentInformation[4],
                                revisedarrival: shipmentInformation[5],
                                numberofpieces: shipmentInformation[6],
                                totalweight: shipmentInformation[7],
                                totalvolume: shipmentInformation[8]
                            },
                            otherreferences: {
                                shippingnumber: shipmentInformation[9]
                            },
                            events,
                            contactinformation: {
                                exportbranch: {
                                    name: shipmentInformation[10],
                                    email: shipmentInformation[11]
                                },
                                importbranch: {
                                    name: shipmentInformation[12],
                                    email: shipmentInformation[13]
                                }
                            },
                            error: !existsContainer ? `Container '${container}' not found` : ''
                        },
                    }
                    resolve(data);
                }, 3000);
            });
        }, container);
        
        fs.writeFile('result.json', JSON.stringify(result), (err: any) => {
            if (err) throw err;
        });

        await browser.close();
    
    }
}