from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import pandas as pd
import time


URL = "https://erolls.tn.gov.in/acwithcandidate_tnla2026/AC_List.aspx"


def start_driver():
    options = Options()
    options.add_argument("--start-maximized")
    options.add_argument("--disable-blink-features=AutomationControlled")

    service = Service(r"C:\chromedriver\chromedriver.exe")

    driver = webdriver.Chrome(service=service, options=options)
    return driver


def extract_candidate_table(driver):
    soup = BeautifulSoup(driver.page_source, "html.parser")

    constituency = ""

    ac = soup.find(id="ContentPlaceHolder1_lb_ac_name")
    if ac:
        constituency = ac.get_text(strip=True)

    table = soup.find("table", class_="tableList")

    if not table:
        print("No candidate table found")
        return []

    rows = []

    for tr in table.find_all("tr"):
        cols = tr.find_all("td")

        if len(cols) < 4:
            continue

        rows.append({
            "Constituency": constituency,
            "Sl_No": cols[0].get_text(strip=True),
            "Candidate_Name": cols[1].get_text(strip=True),
            "Party": cols[2].get_text(strip=True),
            "Symbol": cols[3].get_text(strip=True)
        })

    print(f"{constituency}: {len(rows)} candidates")
    return rows


def main():
    driver = start_driver()
    all_data = []

    try:
        driver.get(URL)
        time.sleep(5)

        # IMPORTANT:
        # Find all constituency clickable controls
        constituency_elements = driver.find_elements(
            By.XPATH,
            "//a[contains(@href,'Form7A') or contains(@href,'__doPostBack')]"
        )

        print(f"Found {len(constituency_elements)} constituencies")

        for i in range(len(constituency_elements)):
            # Re-fetch every loop because page refreshes
            constituency_elements = driver.find_elements(
                By.XPATH,
                "//a[contains(@href,'Form7A') or contains(@href,'__doPostBack')]"
            )

            element = constituency_elements[i]
            constituency_name = element.text.strip()

            if not constituency_name:
                continue

            print(f"[{i+1}] Opening {constituency_name}")

            driver.execute_script("arguments[0].click();", element)
            time.sleep(3)

            rows = extract_candidate_table(driver)
            all_data.extend(rows)

            driver.back()
            time.sleep(3)

        df = pd.DataFrame(all_data)

        df.to_csv("TN_2026_Candidates.csv", index=False)
        df.to_excel("TN_2026_Candidates.xlsx", index=False)

        print("DONE — Files saved successfully")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()