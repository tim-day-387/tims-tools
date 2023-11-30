// ==UserScript==
// @name         GitWeb: copy commit reference
// @version      2
// @author       Andrei Rybak
// @description  Adds a "Copy commit reference" button to every commit page on GitWeb websites.
// @match        https://git.whamcloud.com/*a=commit*
// ==/UserScript==

// SPDX-License-Identifier: AGPL-3.0-only

/*
 * Copyright (C) 2023 Andrei Rybak
 *
 * Forked by Timothy Day for use with Lustre development
 *
 */

const LOG_PREFIX = '[Git: copy commit reference]:';
const CONTAINER_ID = "CCR_container";
const CHECKMARK_ID = "CCR_checkmark";

function error(...toLog) {
    console.error(LOG_PREFIX, ...toLog);
}

function warn(...toLog) {
    console.warn(LOG_PREFIX, ...toLog);
}

function info(...toLog) {
    console.info(LOG_PREFIX, ...toLog);
}

function debug(...toLog) {
    console.debug(LOG_PREFIX, ...toLog);
}

// adapted from https://stackoverflow.com/a/35385518/1083697 by Mark Amery
function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

/**
 * Abstract class corresponding to a Git hosting provider.
 *
 * When subclassing each method that throws an {@link Error} must be implemented.
 * The minimal implementation requires only four methods to be overridden.
 * Some of the methods are allowed to be asynchronous, if the implementation
 * needs to do {@link fetch} requests, e.g. to a REST API of the hosting.
 */
class GitHosting {
    constructor() {
        if (this.constructor == GitHosting) {
            throw new Error("Abstract class cannot be instantiated.");
        }
    }

    /**
     * CSS selector to use to find the element, to which the button will be added.
     * Placement of the button which is static with regard to the length of the
     * commit message and metadata is preferred.
     *
     * @returns {string}
     */
    getTargetSelector() {
        throw new Error("Not implemented in " + this.constructor.name);
    }

    /**
     * Extracts full SHA-1 object name (40-digit hexadecimal string) of the commit.
     * Implementing classes can use both the URL (document.location) and the HTML
     * to determine the hash.
     *
     * @returns {string} full SHA-1 hash of the commit of the current page
     */
    getFullHash() {
        throw new Error("Not implemented in " + this.constructor.name);
    }

    /*
     * Returns author date of the commit in ISO 8601 format,
     * i.e. YYYY-MM-DD, e.g. 2039-12-31
     */
    async getDateIso(hash) {
        throw new Error("Not implemented in " + this.constructor.name);
    }

    /*
     * Returns full commit message of the commit displayed on current webpage.
     * Parameter `hash` is provided as a convenience for subclasses
     * that need the full hash to avoid calling `getFullHash` twice.
     */
    async getCommitMessage(hash) {
        throw new Error("Not implemented in " + this.constructor.name);
    }

    /**
     * CSS selector to use to wait until the webpage is considered loaded.
     * Needs to be overridden only if more than one implementations of
     * GitHosting need to be used.
     */
    getLoadedSelector() {
        return 'body';
    }

    /**
     * Returns `true` if this `GitHosting` recognizes the webpage.
     * This method is only called when the page is loaded according
     * to `getLoadedSelector()`.
     *
     * Needs to be overridden only if more than one implementations of
     * GitHosting need to be used.
     *
     * @returns {boolean} `true` if this `GitHosting` recognizes the webpage.
     */
    isRecognized() {
        return true;
    }

    /**
     * Add additional HTML to wrap around the button container.
     * This method can also be used to add CSS to the given `innerContainer`.
     *
     * By default just returns the given `innerContainer`, without wrapping.
     *
     * @param {HTMLElement} innerContainer see usage of {@link wrapButtonContainer}
     * in {@link doAddButton}.
     */
    wrapButtonContainer(innerContainer) {
        return innerContainer;
    }

    getButtonText() {
        return "Copy commit reference";
    }

    /*
     * Add additional HTML to wrap around the button itself.
     * This method can also be used to add CSS to or alter HTML of
     * the given `button`.
     *
     * By default just returns the given `button`, without wrapping.
     */
    wrapButton(button) {
        return button;
    }

    /*
     * Converts given plain text version of subject line to HTML.
     * Useful for Git hosting providers that have integrations with
     * issue trackers and code review tools.
     *
     * By default just returns its argument.
     */
    async convertPlainSubjectToHtml(plainTextSubject) {
        return plainTextSubject;
    }

    /**
     * Adds a button to copy a commit reference to a target element.
     * Target element is determined according to {@link getTargetSelector}.
     */
    doAddButton() {
        waitForElement(this.getTargetSelector()).then(target => {
            debug('target', target);
            const innerContainer = document.createElement('span');
            const buttonContainer = this.wrapButtonContainer(innerContainer);
            buttonContainer.id = CONTAINER_ID;
            buttonContainer.style.position = 'relative';
            this.addButtonContainerToTarget(target, buttonContainer);
            const button = this.createCopyButton();
            innerContainer.appendChild(button);
            innerContainer.append(this.createCheckmark());
        });
    }

    /**
     * Adds the `buttonContainer` (see {@link CONTAINER_ID}) element to the `target`
     * (see method {@link getTargetSelector}) element.
     *
     * Override this method, if your need customize where the copy button gets
     * put in the interface.
     *
     * By default just appends the `buttonContainer` to the end of `target`.
     *
     * @param {HTMLElement} target element in the native UI of this hosting
     * website, where the userscript puts the "Copy commit reference" button.
     * @param {HTMLElement} buttonContainer the wrapper element around the
     * "Copy commit reference" {@link createCopyButton button} and the
     * checkmark (see method {@link createCheckmark})
     */
    addButtonContainerToTarget(target, buttonContainer) {
        target.append(buttonContainer);
    }

    getButtonTagName() {
        return 'a';
    }

    /*
     * Creates the button element to copy a commit reference to the clipboard.
     */
    createCopyButton() {
        const buttonText = this.getButtonText();
        let button = document.createElement(this.getButtonTagName());
        if (this.getButtonTagName() === 'a') {
            button.href = '#'; // for underline decoration
        }
        button.appendChild(document.createTextNode(buttonText));
        button.setAttribute('role', 'button');
        button = this.wrapButton(button);

        const onclick = (event) => {
            this.#copyClickAction(event);
        }
        button.onclick = onclick;
        return button;
    }

    /**
     * The more fancy Git hostings have on-the-fly page reloads,
     * which aren't proper page reloads.  Clicking on a commit
     * link on these sites doesn't trigger re-running of the
     * userscript (sometimes, at least).  This means that the
     * button that we've added (see {@link addButtonContainerToTarget})
     * will disappear from the page.  To cover such cases, we
     * need to automatically detect that the commit in the
     * URL has changed and _re-add_ the button again.
     *
     * Method {@link setUpReadder} is called once during userscript's
     * lifecycle on a webpage.
     *
     * Subclasses can override this method with their own
     * implementation of an "re-adder".  Re-adders must clear
     * any caches specific to a particular commit.  Re-adders
     * must call the given callback only on webpages that are
     * definitely pages for a singular commit.
     */
    setUpReadder(ensureButtonFn) {
    }

    /**
     * Extracts the first line of the commit message.
     * If the first line is too small, extracts more lines.
     *
     * @param {string} commitMessage the full commit message (subject and body)
     * taken from the webpage. See {@link getCommitMessage} and its
     * implementations in subclasses.
     * @returns {string} subject, extracted from the commit message,
     * Usually, it is the first line of the commit message.
     */
    #commitMessageToSubject(commitMessage) {
        const lines = commitMessage.split('\n');
        if (lines[0].length > 16) {
            /*
             * Most common use-case: a normal commit message with
             * a normal-ish subject line.
             */
            return lines[0].trim();
        }
        /*
         * The `if`s below handles weird commit messages I have
         * encountered in the wild.
         */
        if (lines.length < 2) {
            return lines[0].trim();
        }
        if (lines[1].length == 0) {
            return lines[0].trim();
        }
        // sometimes subject is weirdly split across two lines
        return lines[0].trim() + " " + lines[1].trim();
    }

    /**
     * @param {string} commitHash a hash of a commit, usually SHA1 hash
     * of 40 hexadecimal digits
     * @returns abbreviated hash
     */
    #abbreviateCommitHash(commitHash) {
        return commitHash.slice(0, 7);
    }

    /**
     * Formats given commit metadata as a commit reference according
     * to `git log --format=reference`.  See format descriptions at
     * https://git-scm.com/docs/git-log#_pretty_formats
     *
     * @param {string} commitHash {@link getFullHash hash} of the commit
     * @param {string} subject subject line of the commit message
     * @param {string} dateIso author date of commit in ISO 8601 format
     * @returns {string} a commit reference
     */
    #plainTextCommitReference(commitHash, subject, dateIso) {
        const abbrev = this.#abbreviateCommitHash(commitHash);
        return `${abbrev} ("${subject}")`;
    }

    /**
     * Renders given commit that has the provided subject line and date
     * in reference format as HTML content.  Returned HTML includes
     * a clickable link to the commit, and may include links to issue
     * trackers, code review tools, etc.
     *
     * Documentation of formats: https://git-scm.com/docs/git-log#_pretty_formats
     *
     * @param {string} commitHash {@link getFullHash hash} of the commit
     * @param {string} subjectHtml HTML of pre-rendered subject line of
     * the commit message. See {@link convertPlainSubjectToHtml}.
     * @param {string} dateIso author date of commit in ISO 8601 format
     * @returns {string} HTML code of the commit reference
     */
    #htmlSyntaxCommitReference(commitHash, subjectHtml, dateIso) {
        const url = document.location.href;
        const abbrev = this.#abbreviateCommitHash(commitHash);
        const html = `<a href="${url}">${abbrev}</a> (${subjectHtml}, ${dateIso})`;
        return html;
    }

    #addLinkToClipboard(event, plainText, html) {
        event.stopPropagation();
        event.preventDefault();

        let clipboardData = event.clipboardData || window.clipboardData;
        clipboardData.setData('text/plain', plainText);
        clipboardData.setData('text/html', html);
        this.#showCheckmark();
        setTimeout(() => this.#hideCheckmark(), 2000);
    }

    #showCheckmark() {
        const checkmark = document.getElementById(CHECKMARK_ID);
        checkmark.style.display = 'inline-block';
    }

    #hideCheckmark() {
        const checkmark = document.getElementById(CHECKMARK_ID);
        checkmark.style.display = 'none';
    }

    /**
     * @returns {HTMLElement}
     */
    createCheckmark() {
        const checkmark = document.createElement('span');
        checkmark.id = CHECKMARK_ID;
        checkmark.style.display = 'none';
        checkmark.style.position = 'absolute';
        checkmark.style.left = 'calc(100% + 0.5rem)';
        checkmark.style.whiteSpace = 'nowrap';
        checkmark.append(" ✅ Copied to clipboard");
        return checkmark;
    }

    /*
     * Generates the content and passes it to the clipboard.
     *
     * Async, because we need to access REST APIs.
     */
    async #copyClickAction(event) {
        event.preventDefault();
        try {
            /*
             * Extract metadata about the commit from the UI using methods from subclass.
             */
            const commitHash = this.getFullHash();
            const dateIso = await this.getDateIso(commitHash);
            const commitMessage = await this.getCommitMessage(commitHash);

            const subject = this.#commitMessageToSubject(commitMessage);

            const plainText = this.#plainTextCommitReference(commitHash, subject, dateIso);
            const htmlSubject = await this.convertPlainSubjectToHtml(subject, commitHash);
            const html = this.#htmlSyntaxCommitReference(commitHash, htmlSubject, dateIso);

            info("plain text:", plainText);
            info("HTML:", html);

            const handleCopyEvent = e => {
                this.#addLinkToClipboard(e, plainText, html);
            };
            document.addEventListener('copy', handleCopyEvent);
            document.execCommand('copy');
            document.removeEventListener('copy', handleCopyEvent);
        } catch (e) {
            error('Could not do the copying', e);
        }
    }
}

class CopyCommitReference {
    /**
     * @param  {...GitHosting} hostings
     */
    constructor(...hostings) {
        info(`Got ${hostings.length} hostings`);
        this.#gitHostings = hostings;
    }

    static #removeExistingContainer() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) {
            return;
        }
        container.parentNode.removeChild(container);
    }

    /**
     * @type {GitHosting}
     */
    #recognizedGitHosting = null;

    /**
     * @returns {GitHosting}
     */
    #getRecognizedGitHosting() {
        if (this.#recognizedGitHosting != null) {
            return this.#recognizedGitHosting;
        }
        for (const hosting of this.#gitHostings) {
            if (hosting.isRecognized()) {
                info("Recognized", hosting.constructor.name);
                this.#recognizedGitHosting = hosting;
                waitForElement(`#${CONTAINER_ID}`).then(added => {
                    info('Button has been added. Can setup re-adder now.');
                    hosting.setUpReadder(() => this.#ensureButton());
                });
                return this.#recognizedGitHosting;
            }
        }
        warn("Cannot recognize any hosting");
        return null;
    }

    /**
     * An optimization: for sites, which do page reloads on the fly,
     * we don't need to use selectors from all hostings.  Just using
     * the selector for the recognized hosting should do the trick.
     *
     * @returns {string} a selector for waiting for loading
     */
    #getLoadedSelector() {
        if (this.#recognizedGitHosting != null) {
            return this.#recognizedGitHosting.getLoadedSelector();
        }
        return this.#gitHostings
            .map(h => h.getLoadedSelector())
            .filter(selector => selector.length != 0)
            .join(", ");
    }

    #doEnsureButton() {
        CopyCommitReference.#removeExistingContainer();
        const loadedSelector = this.#getLoadedSelector();
        info("loadedSelector =", `'${loadedSelector}'`);
        waitForElement(loadedSelector).then(loadedElement => {
            info("Loaded from selector", loadedSelector);
            const hosting = this.#getRecognizedGitHosting();
            if (hosting != null) {
                hosting.doAddButton();
            }
        });
    }

    /**
     * On pages that are not for a singular commit, function
     * {@link ensureButton} must be called exactly once, at the
     * bottom of the enclosing function.
     *
     * Re-adders must take care to avoid several `observer`s
     * added by a call to {@link waitForElement} to be in flight.
     */
    #ensureButton() {
        try {
            this.#doEnsureButton();
        } catch (e) {
            error('Could not create the button', e);
        }
    }

    /**
     * An instance of each subclass of `GitHosting` is created,
     * but only one of them gets "recognized".
     *
     * @type {GitHosting}
     */
    #gitHostings;

    /**
     * Entry point for userscripts which use this library.
     * Call this method once with instances of class {@link GitHosting}.
     *
     * @param {...GitHosting} hostings
     */
    static runForGitHostings(...hostings) {
        const ccr = new CopyCommitReference(...hostings);
        ccr.#ensureButton();
    }
}

function waitForElement(selector) {
    return new Promise(resolve => {
        const queryResult = document.querySelector(selector);
        if (queryResult) {
            return resolve(queryResult);
        }
        const observer = new MutationObserver(mutations => {
            const queryResult = document.querySelector(selector);
            if (queryResult) {
                /*
                 * Disconnect first, just in case the listeners
                 * on the returned Promise trigger the observer
                 * again.
                 */
                observer.disconnect();
                resolve(queryResult);
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

(function () {
    'use strict';

    class GitWeb extends GitHosting {
        getTargetSelector() {
            if (document.querySelector('.page_nav_sub')) {
                return '.page_nav_sub';
            }
            return '.page_nav';
        }

        wrapButtonContainer(innerContainer) {
            const container = document.createElement('span');
            container.append(htmlToElement('<span class="barsep"> | </span>'));
            const tab = document.createElement('span');
            tab.classList.add('tab');
            tab.append(innerContainer);
            container.append(tab);
            return container;
        }

        addButtonContainerToTarget(target, buttonContainer) {
            if (target.classList.contains('page_nav_sub')) {
                super.addButtonContainerToTarget(target, buttonContainer);
                return;
            }
            target.insertBefore(buttonContainer, target.querySelector('br'));
        }

        getButtonText() {
            // use all lowercase for consistency with the rest of the UI
            return "copy commit reference";
        }

        getFullHash() {
            /*
             * <td>commit</td> is always above <td>parent</td> and <td>tree</td>
             * so it's fine to just take the first <td> with CSS class `sha1`.
             */
            const cell = document.querySelector('.title_text .object_header td.sha1');
            return cell.innerText;
        }

        getDateIso(hash) {
            /*
             * <td>author</td> is always above <td>committer</td>
             * so it's fine to just take the first <td> with CSS class `sha1`.
             */
            const cell = document.querySelector('.title_text .object_header .datetime');
            const s = cell.innerText;
            const d = new Date(s);
            return d.toISOString().slice(0, 'YYYY-MM-DD'.length);
        }

        getCommitMessage(hash) {
            return document.querySelector('.page_body').innerText;
        }
    }

    CopyCommitReference.runForGitHostings(new GitWeb());
})();
