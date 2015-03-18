/*
 * Night Mode plugin for pentadactyl
 *
 * Copyright (c) 2014 David Hoffmann
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 2 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */


"use strict";


/*
 * NOTE: The actual CSS is based on the style used in Nightshift
 * (https://code.google.com/p/dactyl/issues/detail?id=1013) created by eri!
 * <hans.orter@gmx.de> and vetinari <vetinari.userstyles@inode.at>
 */
//{{{ nightStyle
let nightStyle = 'body, html {' +
    '    min-height: 100%!important;' +
    '}' +
    'html, body {' +
    '    background-color:#111 !important;' +
    '}' +
    'body>*:not(:empty) {' +
    '    background-color:#222 !important;' +
    '}' +
    'body>*>*:not(:empty) {' +
    '    background-color:#222 !important;' +
    '}' +
    'body>*>*>*:not(:empty) {' +
    '    background-color:#282828 !important;' +
    '}' +
    'body>*>*>*>*:not(:empty) {' +
    '    background-color:#282828 !important;' +
    '}' +
    'body>*>*>*>*>*:not(:empty) {' +
    '    background-color:#383838 !important;' +
    '}' +
    'body>*>*>*>*>* * {' +
    '    background-color:#383838 !important;' +
    '}' +
    'body table[border=\"0\"] td {' +
    '    background-color:#111 !important;' +
    '}' +
    'body table table[border=\"0\"] td {' +
    '    background-color:#333 !important;' +
    '}' +
    'body table table table[border=\"0\"] td {' +
    '    background-color:#222 !important;' +
    '}' +
    'body table table table table[border=\"0\"] td {' +
    '    background-color:#444 !important;' +
    '}' +
    'body *:empty {' +
    '    background-color: #252525 !important;' +
    '}' +
    'body p:not(:empty), body p *, body h1, body h1 *, body h2, body h2 *, body h3, body h3 *, body h4, body h4 *, body h5, body h5 *, body strong>*, body b>*, body em>*, body i>*, body span>*:not(img) {' +
    '    background:transparent none !important;' +
    '}' +
    'body h1, body h1 *, body h2, body h2 *, p>strong:only-of-type, p>b:only-of-type {' +
    '    color: #a98 !important;' +
    '}' +
    'body h3, body h3 *, body h4, body h4 * {' +
    '    color: #aaa !important;' +
    '}' +
    '*:not([onclick]):not(input):not(a):not(img):not([class^=\"UI\"]), body a:not(:empty), div:not([onclick]) {' +
    '    background-image:none !important;' +
    '    text-indent:0 !important;' +
    '}' +
    '*[onclick] {' +
    '    color:#79a !important;' +
    '}' +
    '*[onclick]:hover {' +
    '    color:#99a8aa !important;' +
    '}' +
    'body hr {' +
    '    background: #666 none !important;' +
    '    color: #666 !important;' +
    '    border:1px solid #666 !important;' +
    '    height: 1px !important;' +
    '    overflow:hidden !important;' +
    '    display: block !important;' +
    '}' +
    '* {' +
    '    color: #c0c0c0 !important;' +
    '    border-color:#666 !important;' +
    '}' +
    '* body a, body a * {' +
    '    color: #B6AA7B !important;' +
    '}' +
    'body a:hover, body a:hover * {' +
    '    color: #D9C077 !important;' +
    '    text-decoration: underline !important;' +
    '}' +
    'body img, a[href] img, a[href] button, input[type=\"image\"],*[onclick]:empty, body a:empty {' +
    '    opacity:.5 !important;' +
    '}' +
    'body img:hover, a[href]:hover img, a[href]:hover button, *[onclick]:empty:hover, body a:empty:hover {' +
    '    opacity:1 !important;' +
    '}' +
    'body input[type], body textarea[name], body input[name], body input[id], body select[name] {' +
    '    -moz-appearance:none !important;' +
    '    color: #bbb !important;' +
    '    -moz-border-radius:4px !important;' +
    '    border-width: 1px !important;' +
    '    border-color: #778 !important;' +
    '    border-style:solid !important;' +
    '    background:#555 none !important;' +
    '}' +
    'body select[name] {' +
    '    -moz-appearance:none !important;' +
    '    color: #bbb !important;' +
    '    -moz-border-radius:4px !important;' +
    '    border-width: 1px !important;' +
    '    border-color: #778 !important;' +
    '    border-style:solid !important;' +
    '    background-color:#555 !important;' +
    '}' +
    'body input>*, body textarea>* {' +
    '    background:transparent none !important;' +
    '    color: #bbb !important;' +
    '    border-style:solid !important;' +
    '    border-width: 0px !important;' +
    '}' +
    'body select * {' +
    '    background-color:transparent !important;' +
    '    color: #bbb !important;' +
    '    border-style:solid !important;' +
    '    border-width: 0px !important;' +
    '}' +
    'pre:not(:empty), code:not(:empty) , cite:not(:empty), pre:not(:empty) *, code:not(:empty) *, cite:not(:empty) * {' +
    '    background-image: url(data:image/gif;base64,R0lGODlhBAAEAIAAABERESIiIiH5BAAAAAAALAAAAAAEAAQAAAIGTACXaHkFADs=) !important;' +
    '    color: #bcc8dc !important;' +
    '}';
//}}}


// a switch denoting whether Night Mode is currently enabled
gBrowser.nightMode = false;
// add the stylesheet (but don't enable it yet, see the last parameter)
group.styles.add ("nightStyle", "*", nightStyle, undefined, true);


/**
 * Enable/disable Night Mode globally.
 */
function toggleNightMode () {
    gBrowser.nightMode = !gBrowser.nightMode;
}


/**
 * Enable/disable Night Mode for the current tab.
 */
function togglePageNightMode () {
    gBrowser.mCurrentTab.nightMode = !gBrowser.mCurrentTab.nightMode;
}


/**
 * Check whether the stylesheet should get applied to the current tab.
 */
function shouldApplyNightStyle () {
    if (typeof (gBrowser.mCurrentTab.nightMode) == 'undefined') {
        gBrowser.mCurrentTab.nightMode = true;
    }
    return gBrowser.nightMode && gBrowser.mCurrentTab.nightMode;
}


/**
 * Apply the stylesheet on the current tab.
 */
function applyNightStyle () {
    group.styles.sheets.map (function (sheet) sheet.enabled = true);
}


/**
 * Unapply the stylesheet on the current tab.
 */
function unApplyNightStyle () {
    group.styles.sheets.map (function (sheet) sheet.enabled = false);
}


/**
 * If Night Mode is enabled on the current tab, apply the style sheet.
 * Otherwise, unapply it.
 */
function applyOrNot () {
    if (shouldApplyNightStyle ()) {
        applyNightStyle ();
    } else {
        unApplyNightStyle ();
    }
}


group.mappings.add ([modes.NORMAL], ["gn"],
        "Toggle Night Mode",
        function () {
            toggleNightMode ();
            applyOrNot ();
        });


group.mappings.add ([modes.NORMAL], ["gN"],
        "Toggle Night Mode for the current tab (only enabling it if Night Mode is globally enabled)",
        function () {
            togglePageNightMode ();
            applyOrNot ();
        });


group.autocmd.add (["LocationChange"], "*",
        function () {
            applyOrNot ();
        });


// vim: ft=javascript fdm=marker sw=4 ts=4 et:
