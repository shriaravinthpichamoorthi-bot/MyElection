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

    service = Service(
        r"C:\chromedriver-win64\chromedriver.exe"
    )

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

        # Step 1: collect all constituency names first
        elements = driver.find_elements(
            By.XPATH,
            "//a[contains(@href,'Form7A') or contains(@href,'__doPostBack')]"
        )

        constituency_names = []

        for el in elements:
            name = el.text.strip()
            if name:
                constituency_names.append(name)

        constituency_names = list(dict.fromkeys(constituency_names))

        print(f"Found {len(constituency_names)} constituencies")

        # Step 2: open one by one by text
        for idx, name in enumerate(constituency_names, 1):
            print(f"[{idx}] Opening {name}")

            driver.get(URL)
            time.sleep(3)

            element = driver.find_element(
                By.XPATH,
                f"//a[contains(text(), '{name}')]"
            )

            driver.execute_script("arguments[0].click();", element)
            time.sleep(3)

            rows = extract_candidate_table(driver)
            all_data.extend(rows)

        df = pd.DataFrame(all_data)

        df.to_csv("TN_2026_Candidates.csv", index=False)
        df.to_excel("TN_2026_Candidates.xlsx", index=False)

        print("DONE — files saved successfully")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()