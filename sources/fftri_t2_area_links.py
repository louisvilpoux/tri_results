from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, ElementClickInterceptedException
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import urljoin
import time
import pandas as pd

def extract_links(driver):
    """Récupère les épreuves via les liens class='edition btn'."""
    links = []
    elements = driver.find_elements(By.CSS_SELECTOR, "a.edition.btn")
    for el in elements:
        link = urljoin(BASE_URL, el.get_attribute("href"))
        links.append(link)
    return links

BASE_URL = "https://fftri.t2area.com"
START_URL = "https://fftri.t2area.com/resultats.html"

# --- Setup du driver ---
options = webdriver.ChromeOptions()
options.add_argument("--headless")  # retire cette ligne pour voir le navigateur
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

driver.get(START_URL)

SCROLL_PAUSE = 1.5  # temps d'attente après chaque scroll

# --- Infinite scroll ---
last_count = 0
same_count_times = 0   # si ça ne bouge plus après X tours → fin

while True:
    # Scroll jusqu'en bas
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(SCROLL_PAUSE)

    # Récupère les épreuves après scroll
    links = extract_links(driver)
    new_count = len(links)

    print(f"Épreuves chargées : {new_count}")

    if new_count == last_count:
        same_count_times += 1
    else:
        same_count_times = 0

    # Si aucun nouvel élément sur 3 cycles → fin
    if same_count_times >= 3:
        print("Le scroll n'ajoute plus d'épreuves → fin du scraping.")
        break

    last_count = new_count

driver.quit()

# Suppression des doublons éventuels
links = list(set(links))

print(f"\nTotal : {len(links)} épreuves")

df = pd.DataFrame({"url": links})
df.to_csv("./sources/fftri_t2_area/url/urls.csv", index=False)