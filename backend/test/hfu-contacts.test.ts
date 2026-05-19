import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeProtectedEmail, filterHfuContacts, parseHfuContactsHtml, parseHfuFilters } from "../src/modules/hfu-contacts/hfu-contacts.service";

const listHtml = `
<span class="o-highlight-text">1</span>
<article class="c-card c-card--outline c-card--no-image">
  <div class="c-card__body">
    <h2 class="c-card__title">
      <a class="c-card__link" href="https://www.hs-furtwangen.de/personen/profil/1448-tamerabdulbaki-alshirbaji">
        Dr. Tamer Abdulbaki Alshirbaji
      </a>
    </h2>
    <ul class="o-bare-list">
      <li>Telefon <a class="c-card__additional-link" href="tel:+4977203074636">+49 7720 307-4636</a></li>
      <li><a class="c-card__additional-link" href="#" data-mailto-token="hvdgoj5Ovhzm9WwypgwvfdWgncdmwvedVcn8apmorvibzi9yz" data-mailto-vector="-5">E-Mail schreiben</a></li>
    </ul>
  </div>
</article>
<a class="c-facet-option solr-ajaxified" href="https://www.hs-furtwangen.de/personen?tx_solr%5Bfilter%5D%5B0%5D=fFaC%3A386">
  Fakultaet I: Computer Science &amp; Applications
  <span class="c-facet-option__count">114</span>
</a>`;

describe("HFU contacts parser", () => {
  it("decodes TYPO3 protected email tokens", () => {
    assert.equal(decodeProtectedEmail("hvdgoj5Ovhzm9WwypgwvfdWgncdmwvedVcn8apmorvibzi9yz", "-5"), "Tamer.AbdulbakiAlshirbaji@hs-furtwangen.de");
  });

  it("parses contact cards without requiring optional fields", () => {
    const contacts = parseHfuContactsHtml(listHtml);

    assert.equal(contacts.length, 1);
    assert.equal(contacts[0].fullName, "Dr. Tamer Abdulbaki Alshirbaji");
    assert.equal(contacts[0].phone, "+49 7720 307-4636");
    assert.equal(contacts[0].email, "Tamer.AbdulbakiAlshirbaji@hs-furtwangen.de");
  });

  it("parses official filter facets", () => {
    const filters = parseHfuFilters(listHtml);

    assert.deepEqual(filters[0], {
      category: "faculty",
      count: 114,
      id: "fFaC:386",
      label: "Fakultaet I: Computer Science & Applications",
      solrFilter: "fFaC:386",
    });
  });

  it("filters case-insensitively across available fields", () => {
    const contacts = parseHfuContactsHtml(listHtml, "https://www.hs-furtwangen.de/personen", {
      category: "faculty",
      count: 114,
      id: "fFaC:386",
      label: "Computer Science",
      solrFilter: "fFaC:386",
    });

    assert.equal(filterHfuContacts(contacts, "computer").length, 1);
    assert.equal(filterHfuContacts(contacts, "not-present").length, 0);
  });
});
