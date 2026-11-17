import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import pandas as pd
import os
import re
from datetime import datetime, date
from tqdm.asyncio import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import traceback

MONTHS_FR = {
    "janvier": 1,
    "février": 2,
    "fevrier": 2,
    "mars": 3,
    "avril": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "août": 8,
    "aout": 8,
    "septembre": 9,
    "octobre": 10,
    "novembre": 11,
    "décembre": 12,
    "decembre": 12,
}

def coalesce(*values):
    for v in values:
        if v is not None:
            return v
    return None

def extract_race_info(url):
    path = urlparse(url).path
    parts = path.strip("/").split("/")
    annee = os.path.splitext(parts[3])[0]
    name = parts[1].replace("-", " ")
    format = parts[2].replace("-", " ")
    return name, format, annee

def create_race_unicity(url):
    path = urlparse(url).path
    parts = path.strip("/").split("/")
    return os.path.splitext("_".join(parts[1:]))[0]

def extract_date_race(response):
    html = response.text
    m = re.search(r"édition du\s*([0-9]{2}-[0-9]{2}-[0-9]{4})", html)
    if m:
        date_str = datetime.strptime(m.group(1), "%d-%m-%Y")
        return date(date_str.year, date_str.month, date_str.day)
    
def extract_date_from_text(text):
    pattern = r"(\d{1,2}\s+[A-Za-zéèêûôîçÉÈÊÛÔÎÇ]+\s+\d{4})"
    m = re.search(pattern, text)
    if m:
        date_str = m.group(1)
        day, month_fr, year = date_str.lower().split()
        return date(int(year), MONTHS_FR[month_fr], int(day))
    
def is_valid_page(resp):
    p_note = ""
    soup = BeautifulSoup(resp.text, "html.parser")
    for div_detail in soup.find_all("div", class_="note__content"):
        p = div_detail.find("p")
        if p:
            p_note = p.get_text(strip=True)
    if p_note in ["Résultat introuvable, nous vous redirigeons vers le calendrier",
                  "Epreuve introuvable, nous vous redirigeons vers le calendrier",
                  "Edition introuvable, nous vous redirigeons vers le calendrier"]:
        print("Page sans donnée")
        return False
    else:
        return True

def extract_description_event(resp):
    soup = BeautifulSoup(resp.text, "html.parser")
    article = soup.find("article", class_="edition-description-content")
    if article:
        text = article.get_text(separator="\n", strip=True)
        name_epreuve = text.split("\n")[1]
        date_epreuve = extract_date_from_text(text.split("\n")[2])
        return name_epreuve, date_epreuve
    
def safe_set_full_text(full_text, position, text_to_replace, custom_split=None):
    try:
        if not full_text:
            return None
        else:
            output = full_text[position].replace(text_to_replace, "")
            if custom_split == "rang_course":
                return output.split("+")[0].split("=")[0]
            elif custom_split == "indice_performance":
                return output.split(" ")[0].split("=")[0]
            elif custom_split == "indice_performance_reference":
                return output.split(" ")[1].replace("(","").replace(")","")
            else:
                return output
    except Exception as e:
        print(e)
        print(f"position {position} text_to_replace {text_to_replace}")
        print(full_text)

def get_row(tds, headers):
    row = {}
    for i, header in enumerate(headers):
        cell = tds[i]
        # deal with "Détails" part
        if header.lower().startswith("dét"):
            a = cell.find("a")
            if a and a.get("href"):
                row[header] = urljoin(BASE, a.get("href"))
            else:
                row[header] = None
        else:
            row[header] = cell.get_text(strip=True)
    return row

def get_full_text(section):
    full_text = []
    lists = section.find_all("ul")
    for idx, ul in enumerate(lists, start=1):
        for li in ul.find_all("li"):
            text = li.get_text(strip=True)
            full_text.append(text)
    return full_text

def parse_text(full_text, row):
    row["rang_global"] = safe_set_full_text(full_text, 0, "Rang Global")
    row["rang_sexe"] = safe_set_full_text(full_text, 1, "Rang Sexe")
    row["rang_categorie"] = safe_set_full_text(full_text, 2, "Rang Catégorie")
    row["categorie"] = safe_set_full_text(full_text, 3, "CATÉGORIE")
    row["indice_performance"] = safe_set_full_text(full_text, 4, "IP (IPR)", "indice_performance")
    row["indice_performance_reference"] = safe_set_full_text(full_text, 4, "IP (IPR)", "indice_performance_reference")
    row["total_time"] = safe_set_full_text(full_text, 6, "Temps")
    row["swim_time"] = safe_set_full_text(full_text, 11, "Temps")
    row["rang_swim"] = safe_set_full_text(full_text, 12, "Rang / Natation")
    row["rang_course_swim"] = safe_set_full_text(full_text, 13, "Rang / Course", "rang_course")
    row["indice_performance_swim"] = safe_set_full_text(full_text, 14, "IP Natation")
    row["t1_time"] = safe_set_full_text(full_text, 16, "Temps")
    row["rang_t1"] = safe_set_full_text(full_text, 17, "Rang / Transition 1")
    row["rang_course_t1"] = safe_set_full_text(full_text, 18, "Rang / Course", "rang_course")
    row["indice_performance_t1"] = safe_set_full_text(full_text, 19, "IP Transition 1")
    row["bike_time"] = safe_set_full_text(full_text, 21, "Temps")
    row["rang_bike"] = safe_set_full_text(full_text, 22, "Rang / Vélo")
    row["rang_course_bike"] = safe_set_full_text(full_text, 23, "Rang / Course", "rang_course")
    row["indice_performance_bike"] = safe_set_full_text(full_text, 24, "IP Vélo")
    row["t2_time"] = safe_set_full_text(full_text, 26, "Temps")
    row["rang_t2"] = safe_set_full_text(full_text, 27, "Rang / Transition 2")
    row["rang_course_t2"] = safe_set_full_text(full_text, 28, "Rang / Course", "rang_course")
    row["indice_performance_t2"] = safe_set_full_text(full_text, 29, "IP Transition 2")
    row["run_time"] = safe_set_full_text(full_text, 31, "Temps")
    row["rang_run"] = safe_set_full_text(full_text, 32, "Rang / Course à Pied")
    row["rang_course_run"] = safe_set_full_text(full_text, 33, "Rang / Course", "rang_course")
    row["indice_performance_run"] = safe_set_full_text(full_text, 34, "IP Course à Pied")
    return row

def fill_missing_sport_time(sport_time_dict):
    for sport in ["Natation", "T1", "Vélo", "T2", "Course à Pied"]:
        if sport not in sport_time_dict:
            sport_time_dict[sport] = None
    return sport_time_dict

def create_empty_file(url):
    df_empty = pd.DataFrame(columns=["clt","temps","nom","club","cat","détails","categorie","total_time","swim_time","t1_time","bike_time","t2_time","run_time","name_epreuve","format_epreuve","year_epreuve","date_epreuve"])
    df_empty.to_csv(f"./sources/fftri_t2_area/fftri_t2_area_0/{create_race_unicity(url)}.csv", index=False)

def get_response(url):
    headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML,"
        " like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response

def process_data(url):
    try:
        # do not compute already computed races
        files = os.listdir("./sources/fftri_t2_area/fftri_t2_area_0/")
        if create_race_unicity(url)+".csv" in files:
            return

        url_page_event = "/".join(url.split("/")[:-1])
        response_page_event = get_response(url_page_event)
        if not is_valid_page(response_page_event):
            create_empty_file(url_page_event)
            return

        response_main_page = get_response(url)
        date_epreuve = extract_date_race(response_main_page)
        soup = BeautifulSoup(response_main_page.text, "html.parser")

        rows = []
        result_blocks_a = soup.find_all("a", class_="edition-result-main")
        result_blocks_div = soup.find_all("div", class_="edition-result-main")
        if len(result_blocks_div) > len(result_blocks_a):
            result_blocks = result_blocks_div
        elif len(result_blocks_a) > len(result_blocks_div):
            result_blocks = result_blocks_a
        else:
            create_empty_file(url_page_event)
            return
        for block in result_blocks:
            # extraction du classement
            rank_elem = block.find("span", class_="edition-rank")
            rank = rank_elem.get_text(strip=True) if rank_elem else None

            # extraction du nom de l'athlète
            name_elem = block.find("div", class_="edition-name")
            name = name_elem.get_text(strip=True) if name_elem else None

            # extraction du club et de la catégorie
            club_elem = block.find("div", class_="edition-club")
            club = club_elem.contents[0].strip() if club_elem else None
            if len(club) > 0:
                if club[-1] == "·":
                    club = club[:-2]
                if club == "·":
                    club = None
            else:
                club = None
            cat_elem = block.find("span", class_="edition-cat-badge")
            cat = cat_elem.get_text(strip=True) if cat_elem else None

            # extraction du temps total
            time_elem = block.find("span", class_="edition-time")
            total_time = time_elem.get_text(strip=True) if time_elem else None

            # récupération du lien individuel de l'athlète
            profile_link = block.get("href", "N/A")

            block_parent = block.find_parent()
            div_splits = block_parent.find_all("div", class_="edition-split")
            details_link = block_parent.find_all("a", class_="edition-details-link")

            # extraction des temps par sport
            sport_time = {}
            for element in div_splits:
                label_elem = element.find("small")
                label = label_elem.get_text(strip=True) if label_elem else ""
                time_elem = element.find("b")
                time_value = time_elem.get_text(strip=True) if time_elem else ""
                sport_time[label] = time_value
            sport_time = fill_missing_sport_time(sport_time)

            href = None
            for element in details_link:
                if element.find("i", class_="fa-list-ol"):
                    href = element.get("href")

            rows.append({
                "clt": rank,
                "nom": name,
                "club": club,
                "cat": cat,
                "temps": total_time,
                "swim": sport_time["Natation"],
                "t1": sport_time["T1"],
                "bike": sport_time["Vélo"],
                "t2": sport_time["T2"],
                "run": sport_time["Course à Pied"],
                "détails": coalesce(href, profile_link),
            })


        df = pd.DataFrame(rows)
        print(url)
        name, format, year = extract_race_info(url)
        print(name, format, year)
        #descr_name_epreuve, descr_date_epreuve = extract_description_event(response_page_event)
        df["name_epreuve"] = name#coalesce(name, descr_name_epreuve)
        df["format_epreuve"] = format
        df["year_epreuve"] = coalesce(year, date_epreuve.year)#, descr_date_epreuve.year)
        df["date_epreuve"] = str(date_epreuve)#coalesce(str(date_epreuve), str(descr_date_epreuve))
        df.to_csv(f"./sources/fftri_t2_area/fftri_t2_area_0/{create_race_unicity(url)}.csv", index=False)
        print("done")
    except Exception as e:
        print(f"error with {url} : {e}")
        print(traceback.format_exc())
        return url


BASE = "https://fftri.t2area.com"

df = pd.read_csv("./sources/fftri_t2_area/url/urls.csv")

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(process_data, url) for url in df["url"]]
    with tqdm(total=len(df.index), desc="Collecting data from FFTRI") as pbar:
        for future in as_completed(futures):
            url = future.result()
            pbar.update(1)

# for url in df["url"]:
#     if url in ["https://fftri.t2area.com/calendrier/natureman/triathlon-l/2013.html",
#                "https://fftri.t2area.com/calendrier/ironman-de-vichy/triathlon-xxl/2013.html"]:
#         process_data(url)
#         break