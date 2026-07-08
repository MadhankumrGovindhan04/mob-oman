#!/usr/bin/env python3
"""Verify app availability in Apple App Store and Google Play Store."""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

USER_AGENT = "mob-oman-store-check/1.0"


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def fetch_text(url: str) -> tuple[int, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        return error.code, body


def check_ios_app_store(
    app_name: str,
    bundle_id: str,
    country: str,
) -> None:
    print(f"\n=== iOS App Store ({country.upper()}) ===")
    print(f"App name : {app_name}")
    print(f"Bundle ID: {bundle_id}")

    search_url = (
        "https://itunes.apple.com/search?"
        + urllib.parse.urlencode(
            {
                "term": app_name,
                "country": country,
                "entity": "software",
                "limit": 25,
            }
        )
    )
    search_data = fetch_json(search_url)
    search_matches = [
        item
        for item in search_data.get("results", [])
        if item.get("bundleId") == bundle_id
    ]

    if search_matches:
        app = search_matches[0]
        print("PASS: Found in App Store search results")
        print(f"  Name   : {app.get('trackName')}")
        print(f"  Version: {app.get('version')}")
        print(f"  URL    : {app.get('trackViewUrl')}")
    else:
        print("FAIL: App not found when searching by name in App Store")
        print(f"  Search URL: {search_url}")
        print(f"  Results returned: {search_data.get('resultCount', 0)}")
        sys.exit(1)

    lookup_url = (
        "https://itunes.apple.com/lookup?"
        + urllib.parse.urlencode({"bundleId": bundle_id, "country": country})
    )
    lookup_data = fetch_json(lookup_url)

    if lookup_data.get("resultCount", 0) < 1:
        print("FAIL: App not found via iTunes lookup API")
        print(f"  Lookup URL: {lookup_url}")
        sys.exit(1)

    lookup_app = lookup_data["results"][0]
    print("PASS: Found via iTunes lookup API")
    print(f"  Name   : {lookup_app.get('trackName')}")
    print(f"  Version: {lookup_app.get('version')}")
    print(f"  URL    : {lookup_app.get('trackViewUrl')}")


def check_google_play_store(
    app_name: str,
    package_name: str,
    country: str,
) -> None:
    print(f"\n=== Google Play Store ({country.upper()}) ===")
    print(f"App name     : {app_name}")
    print(f"Package name : {package_name}")

    listing_url = (
        "https://play.google.com/store/apps/details?"
        + urllib.parse.urlencode({"id": package_name, "hl": "en", "gl": country})
    )
    status, body = fetch_text(listing_url)

    if status != 200:
        print(f"FAIL: Play Store listing not available (HTTP {status})")
        print(f"  URL: {listing_url}")
        sys.exit(1)

    print("PASS: Play Store listing page is live")
    print(f"  URL: {listing_url}")

    title_match = re.search(r'<meta property="og:title" content="([^"]+)"', body)
    if title_match:
        print(f"  Title: {title_match.group(1)}")

    search_url = (
        "https://play.google.com/store/search?"
        + urllib.parse.urlencode(
            {
                "q": app_name,
                "c": "apps",
                "hl": "en",
                "gl": country,
            }
        )
    )
    search_status, search_body = fetch_text(search_url)

    if search_status != 200:
        print(f"WARN: Play Store search page returned HTTP {search_status}")
        print(f"  URL: {search_url}")
        return

    package_patterns = [
        re.escape(package_name),
        urllib.parse.quote(package_name, safe=""),
    ]
    found_in_search = any(pattern in search_body for pattern in package_patterns)

    if found_in_search:
        print("PASS: App appears in Play Store search results")
        print(f"  Search URL: {search_url}")
    else:
        print("WARN: Listing is live, but package was not found in search HTML")
        print("  This can happen due to regional ranking or Play Store page format changes.")
        print(f"  Search URL: {search_url}")


def main() -> None:
    app_name = os.environ.get("APP_NAME", "Brisbane Broncos")
    ios_bundle_id = os.environ.get("IOS_BUNDLE_ID", "au.com.nrl.brisbanebroncos")
    android_package = os.environ.get("ANDROID_PACKAGE", "com.telstra.nrl.broncos")
    country = os.environ.get("STORE_COUNTRY", "au").lower()

    print("Store availability check")
    print(f"Country: {country.upper()}")

    check_ios_app_store(app_name, ios_bundle_id, country)
    check_google_play_store(app_name, android_package, country)

    print("\nAll store checks passed.")


if __name__ == "__main__":
    main()
