/*
 * tab-groups plugin for pentadactyl
 *
 * Copyright (c) 2015 David Hoffmann
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


/*
 * NOTE: Documentation is at the tail of this file.
 */


// TODO: check this (and other work!)
/*
 * NOTE: Based on the works by teramako <teramako@gmail>.
 */


"use strict";


// {{{ commands
group.commands.add (["tabg[roup]", "tg"],
    "Tabgroup Management",
    function (args) {
        if (args["-add"])
            createGroup (args["-add"], true)

        else if (args["-list"])
            window.alert ("list");

        // else if (args["-pulltab"]) {
            // let activeGroup = getInitializedTabView ().GroupItems.getActiveGroupItem ();
            // if (!activeGroup) {
            //     dactyl.echoerr ("Cannot pull tab to the current group");
            //     return;
            // }
            // let buffer = args["-pulltab"];
            // window.alert (buffer)
            // if (!buffer)
            //     return;

            // let tabItems = tabs.getTabsFromBuffer (buffer);
            // if (tabItems.length == 0) {
            //     dactyl.echoerr ("No matching buffer for: " + buffer);
            //     return;
            // } else if (tabItems.length > 1) {
            //     dactyl.echoerr ("More than one match for: " + buffer);
            //     return;
            // }
            // moveTab (tabItems[0], activeGroup, args.bang);
        // }

        else if (args["-pushtab"]) {
            let currentTab = tabs.getTab ();
            if (currentTab.pinned) {
                liberator.echoerr ("Cannot move an App Tab");
                return;
            }
            let groupName = args["-pushtab"];
            let group = findGroup (groupName);
            if (!group) {
                if (args.bang)
                    group = createGroup (groupName);
                else {
                    liberator.echoerr ("No such group: " + groupName.quote () + ". Add \"!\" if you want to create it.");
                    return;
                }
            }
            moveTab (currentTab, group);
        }

        else if (args["-remove"])
            remove (args["-remove"])

        else if (args["-switch"])
            switchTo (args["-switch"])
    },
    {
        argCount: "?",
        // literal: 1,
        options: [
            {
                names: ["-add", "-a"],
                description: "Create a tabgroup and switches to it",
                type: CommandOption.STRING
            },
            {
                names: ["-list", "-l"],
                description: "List all tabgroups"
            },
            // {
            //     names: ["-pulltab"],
            //     description: "Move a tab from another Tab Group to the current one",
            //     type: CommandOption.STRING,
            //     // validator: function,
            //     completer: function (context) completion.buffer (context),
            //     literal: 0
            // },
            {
                names: ["-pushtab"],
                description: "Move a tab from the current tabgroup to another one",
                type: CommandOption.STRING,
                // validator: function,
                completer: function (context) {
                    return tabgroupCompleter (context, true)
                }
            },
            {
                names: ["-remove", "-r"],
                description: "Delete a tabgroup",
                type: CommandOption.STRING,
                // validator: function,
                completer: function (context) {
                    return tabgroupCompleter (context, true)
                }
            },
            {
                names: ["-switch", "-s"],
                description: "Switch to a tabgroup",
                type: CommandOption.STRING,
                // validator: function,
                completer: function (context) {
                    return tabgroupCompleter (context, true)
                }
            }
        ]

    });
// }}}


// {{{ completer
// TODO: understand
function tabgroupCompleter (context, excludeActiveGroup) {

    let GI = getInitializedTabView ().GroupItems;
    let groupItems = GI.groupItems;
    if (excludeActiveGroup) {
        let activeGroup = GI.getActiveGroupItem ();
        if (activeGroup)
            groupItems = groupItems.filter (function (group) group.id != activeGroup.id);
    }
    context.title = ["Tab Group"];
    context.anchored = false;
    context.completions = groupItems.map (function (group) {
        let title = group.id + ": " + (group.getTitle () || "(Untitled)");
        let desc = "Tabs: " + group.getChildren ().length;

        return [title, desc];
    });
}
// }}}



// TODO: removed tabGroup object around these functions
// TODO: use more dactyl.assert?



// {{{ getInitializedTabView ()
/**
 * Get the window.TabView object.  If it isn't properly initialized yet, start
 * initialization, wait until it is finished and return the object afterwards.
 *
 * @return {TabView} The properly initialized window.TabView
 */
function getInitializedTabView () {
    let tv = window.TabView;

    if (!tv)
        return null;
    // if the TabView isn't initialized yet, initialize it
    else if (!tv._window || !tv._window.GroupItems) {
        let waiting = true;
        tv._initFrame (function () { waiting = false; });
        while (waiting)
            dactyl.threadYield (false, true);
    }

    return tv._window;
}
// }}}


// {{{ getPinnedTabs ()
/**
 * Get an array containing all pinned tabs.
 *
 * @return {Array} An array of all pinned tabs
 */
function getPinnedTabs () {
    let pinnedTabs = [];

    for (let tab of config.tabbrowser.tabs) {
        if (tab.pinned)
            pinnedTabs.push (tab);
        else
            break;
    }

    return pinnedTabs;
}
// }}}


// TODO: decipher parameter count
// {{{ findGroup (name, count)
/**
 * Get a GroupItem object (a Tab Group) by its name or id.
 *
 * @param {string|number} name The group's id and/or name
 * @param {number} count
 * @return {GroupItem}
 */
function findGroup (name, count) {
    // TODO: this function might be more performant if one tries first to
    // extract a number from name (instead of checking its type?); this
    // depends on how it is called most often -- with a number-typed
    // parameter or with a string parameter

    if (!count)
        count = 1;

    // gets assigned a function that returns whether a given GroupItem is the
    // searched one
    let test;
    if (typeof name == "number")
        test = function (g) g.id == name;
    else {
        name = name.toLowerCase ();
        let id;
        let matches = name.match (/^(\d+)(?::(?:\s+(.*))?)?$/);
        if (matches)
            [, id, name] = matches;

        if (id) {
            id = parseInt (id, 10);
            test = function (g) g.id == id;
        }
        else
            test = function (g) g.getTitle ().toLowerCase () == name;
    }

    let i = 0;
    for (let group of getInitializedTabView ().GroupItems.groupItems) {
        if (test (group)) {
            i++;
            if (i == count)
                return group;
        }
    }

    return null;
}
// }}}


// TODO: unification; uses either an index, a relative index or a string (and findGroup)
// TODO: disable relative indices (who needs that when switching
// tabgroups...)?
// {{{ switchTo (spec, wrap)
/**
 * Switch to a group or an orphaned tab.
 *
 * @param {String|Number} spec The group's index, relative to the currently
 * activated group (a number preceded by '+' or '-'), or its absolute index
 * and/or name
 * @param {boolean} wrap Whether relative indices should wrap
 */
function switchTo (spec, wrap) {
    let GI = getInitializedTabView ().GroupItems;
    let current = GI.getActiveGroupItem () || GI.getActiveOrphanTab ();
    let groups = GI.groupItems;
    // TODO: most probable explanation of this variable: sometimes, possible
    // index numbers are omitted; therefore, when switching relatively, one has
    // to probe which index actually exists.  offset determines whether to go
    // upwards or downwards.
    let offset = 1;
    let relative = false;

    // will contain the absolute index of the Tab Group to switch to
    let index;
    // if an absolute index was given
    if (typeof spec === "number")
        index = parseInt (spec, 10);
    // if a relative index was given
    else if (/^[+-]\d+$/.test (spec)) {
        relative = true;
        let relativeIndex = parseInt (spec, 10);
        offset = relativeIndex >= 0 ? 1 : -1;
        index = groups.indexOf (current) + relativeIndex;
    }
    // if something else was given, use the findGroup function to find the
    // index
    else if (spec != "") {
        let targetGroup = findGroup (spec);
        if (targetGroup)
            index = groups.indexOf (targetGroup);
        else {
            dactyl.echoerr ("No such tab group: " + spec);
            return;
        }
    } else
        return;

    let length = groups.length;
    let pinned = getPinnedTabs;

    function groupSwitch (index, wrap) {
        // if the index is out of range, wrap (but only if wrap is true)
        if (index > length - 1)
            index = wrap ? index % length : length - 1;
        else if (index < 0)
            index = wrap ? index % length + length : 0;

        // determine the Tab Group and tab to be selected
        let target = groups[index]
        let group = null;
        if (target instanceof getInitializedTabView ().GroupItem) {
            // the group to be selected
            group = target;
            // the tab to be selected
            target = target.getActiveTab () || target.getChild (0);
        }

        // if a tab was found in the group
        if (target)
            // select it
            gBrowser.mTabContainer.selectedItem = target.tab;
        // if the group doesn't contain any tabs
        else if (group) {
            // create a new tab, if there are no pinned tabs
            if (pinned.length === 0)
                group.newTab ();
            // else, select the first pinned tab
            else {
                GI.setActiveGroupItem (group);
                getInitializedTabView ().UI.goToTab (tabs.getTab (0));
            }
        }
        // if the index doesn't exist (but a relative index was given
        // initially), start searching for it
        else if (relative) {
            groupSwitch (index + offset, true);
        } else {
          dactyl.echoerr ("Cannot switch to tab group: " + spec);
          return;
        }
    }
    groupSwitch (index, wrap);
}
// }}}


// {{{ createGroup (name, shouldSwitch, tab)
/**
 * Create a new Tab Group.
 *
 * @param {string} name The Name of the new Tab Group
 * @param {boolean} shouldSwitch Whether it should be switched to the new
 * tabgroup
 * @param {element} tab A tab that should be moved to the new Tab Group
 * @return {GroupItem} The new GroupItem (a Tab Group)
 */
function createGroup (name, shouldSwitch, tab) {
    let group = new getInitializedTabView ().GroupItem ([], { bounds: undefined, title: name });

    if (tab && !tab.pinned)
        window.TabView.moveTabTo (tab, group.id);

    if (shouldSwitch) {
        // TODO: clean many lets
        let pinnedTabs = getPinnedTabs;
        let child = group.getChild (0);
        // if there is a non-pinned tab in the Tab Group, select it
        if (child) {
            getInitializedTabView ().GroupItems.setActiveGroupItem (group);
            getInitializedTabView ().UI.goToTab (child.tab);
        }
        // else, if there are no pinned tabs either, create an empty tab
        else if (pinnedTabs.length == 0)
            // this method automatically switches to the new tab (and thus
            // to the group)
            group.newTab ();
        // else, select the last app tab (if existant)
        else {
            getInitializedTabView ().GroupItems.setActiveGroupItem (group);
            getInitializedTabView ().UI.goToTab (pinnedTabs[pinnedTabs.length - 1]);
        }

    }
    return group;
}
// }}}


// TODO: unifcation; uses a GroupItem or string and findGroup
// {{{ moveTab (tab, group, shouldSwitch)
/**
 * Move a tab to a Tab Group.
 *
 * @param {element} tab The tab to move
 * @param {GroupItem||string} group The Tab Group to move the tab to (either
 * a GroupItem or a string that can be used to determine the corresponding
 * GroupItem using findGroup)
 * @param {boolean} shouldSwitch Whether to switch to the tab after moving
 * it
 */
function moveTab (tab, group, shouldSwitch) {
    dactyl.assert (tab && !tab.pinned, "Cannot move an AppTab");

    let groupItem = (group instanceof getInitializedTabView ().GroupItem) ? group : findGroup (group);
    dactyl.assert (groupItem, "No such group: " + group);

    if (groupItem) {
        window.TabView.moveTabTo (tab, groupItem.id);
        if (shouldSwitch)
            getInitializedTabView ().UI.goToTab (tab);
    }
}
// }}}


// TODO: unifcation; always uses a string and findGroup
// {{{ remove (groupName)
/**
 * Close all tabs in the given (or current) Tab Group (and thus, remove the Tab
 * Group altogether).
 *
 * @param {string} groupName The Tab Group to close all tabs in (if
 * undefined, the current Tab Group's tabs are being closed)
 */
function remove (groupName) {
    // TODO: rename this variable?
    let GI = getInitializedTabView ().GroupItems;
    let activeGroup = GI.getActiveGroupItem ();
    let group = groupName ? findGroup (groupName) : activeGroup;
    dactyl.assert (group, "No such group: " + groupName);

    if (group === activeGroup) {
        let gb = config.tabbrowser;
        let vTabs = gb.visibleTabs;
        // if there are tabs outside the current Tab Group (they then must be in
        // other Tab Groups)
        if (vTabs.length < gb.tabs.length)
            // TODO: switch to the _first_ Tab Group
            // switch to the next Tab Group
            switchTo ("+1", true);
        else {
            let pinnedTabs = getPinnedTabs;
            // if there are no pinned tabs, create a new blank tab
            if (pinnedTabs.length == 0)
                gb.loadOnTab (window.BROWSER_NEW_TAB_URL || "about:blank", { inBackground: false, relatedToCurrent: false });
            // else switch to the last pinned tab
            else
                gb.mTabContainer.selectedIndex = pinnedTabs.length - 1;

            // TODO: why is this necessary? shouldn't group.closeAll ()
            // suffice?
            // close all visible tabs that are not pinned tabs
            for (let i = vTabs.length - 1, tab; (tab = vTabs[i]) && !tab.pinned; i--)
                gb.removeTab (tab);

            return;
        }
    }
    group.closeAll ();
}
// }}}


// {{{ documentation
var INFO =
["plugin", { name: "tabgroups",
             version: "0.1",
             // href: "http://dactyl.sf.net/pentadactyl/plugins#flashblock-plugin",
             summary: "Tabgroup Support",
             xmlns: "dactyl" },
    ["author", { email: "david.and.hoffmann@gmail.com" },
        "David Hoffmann"],
    ["license", { href: "http://opensource.org/licenses/mit-license.php" },
        "MIT"],
    ["project", { name: "Pentadactyl", "min-version": "1.0" }],
    ["p", {},
        "When finished, this plugin shall provide the same features as",
        "Vimperator concerning tabgroups."],

    ["item", {},
        ["tags", {}, ":tabgroup-create :tgc"],
        ["strut"],
        ["spec", {}, ":tabgroup-create"],
        ["description", {},
            ["p", {},
                "Create a tabgroup."]]],

    ["item", {},
        ["tags", {}, ":tabgroup-delete :tgd"],
        ["strut"],
        ["spec", {}, ":tabgroups-delete"],
        ["description", {},
            ["p", {},
                "Delete a tabgroup."]]]

];
// }}}


// vim: ft=javascript fdm=marker sw=4 ts=4 et:
