import requests
import re
import json
from bs4 import BeautifulSoup

domain = "https://www.concordia.ca"
subdirectory = "/maps/buildings.html"

with open('building_information.json', 'r') as f:
    data = json.load(f)


def get_building_details(building_url):
    details = {"departments": [], "services": [], "venue": [], "accessibility": []}
    resp = requests.get(building_url)
    linkSoup = BeautifulSoup(resp.content, 'html.parser')

    # Locate the container for departments/services
    parsys_parent = linkSoup.find(class_="parsys")
    if parsys_parent:

        accessibility_bloc = parsys_parent.select('.bloc.accessibility')
        if accessibility_bloc:
            features = accessibility_bloc[0].find_all('b')
            for feature in features:
                details['accessibility'].append(feature.get_text(strip=True))

        list_sections = parsys_parent.find_all('div', class_='c-link-list')
        header_map = {"Departments": "departments", "Services": "services", "Venues": "venue"}


        for section in list_sections:
            h2 = section.find('h2', class_='c-link-list__heading')
            if h2:
                category = h2.get_text(strip=True)
                json_key = header_map.get(category)
                if json_key:
                    links = section.find_all('a')
                    details[json_key] = [l.get_text(strip=True) for l in links]
    return details

response = requests.get(domain + subdirectory)
soup = BeautifulSoup(response.content, 'html.parser')
building_links = soup.find_all(lambda tag: tag.has_attr('href') and re.compile("buildings/.{1,10}.html").search(tag['href']))

for link_tag in building_links:
    building_code = link_tag['href'].split('/')[-1].split('.')[0].upper()
    full_url = domain + link_tag['href']

    print(f"{building_code}")


    extra_info = get_building_details(full_url)

    #match data and update
    for campus in data:
        for building in data[campus]:
            if building['code'] == building_code:
                building['departments'] = extra_info['departments']
                building['services'] = extra_info['services']
                building['venues'] = extra_info['venue']
                building['accessibility'] = extra_info['accessibility']

# Save the updated result
with open('updated_buildings.json', 'w') as f:
    json.dump(data, f, indent=2)