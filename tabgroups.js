/*
 * Tabgroup plugin for pentadactyl
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


/*
 * NOTE: Based on the works by teramako <teramako@gmail>.
 */


"use strict";


// switchTo: function (spec, wrap)
// createGroup: function createGroup (name, shouldSwitch, tab)
// moveTab: function moveTabToGroup (tab, group, shouldSwitch)
// remove: function removeGroup (groupName)


// TODO: check for /\w\(/
group.commands.add (["tabg[roup]", "tg"],
    "Tabgroup Management",
    function (args) {
        if (args["-add"])
            tabGroup.createGroup (args["-add"], true)

        else if (args["-list"])
            window.alert ("list");

        // else if (args["-pulltab"]) {
            // let activeGroup = tabGroup.tabView.GroupItems.getActiveGroupItem ();
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
            // tabGroup.moveTab (tabItems[0], activeGroup, args.bang);
        // }

        else if (args["-pushtab"]) {
            let currentTab = tabs.getTab ();
            if (currentTab.pinned) {
                liberator.echoerr ("Cannot move an App Tab");
                return;
            }
            let groupName = args["-pushtab"];
            let group = tabGroup.findGroup (groupName);
            if (!group) {
                if (args.bang)
                    group = tabGroup.createGroup (groupName);
                else {
                    liberator.echoerr ("No such group: " + groupName.quote () + ". Add \"!\" if you want to create it.");
                    return;
                }
            }
            tabGroup.moveTab (currentTab, group);
        }

        else if (args["-remove"])
            tabGroup.remove (args["-remove"])

        else if (args["-switch"])
            tabGroup.switchTo (args["-switch"])
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
            //     description: "Move a tab from another tabgroup to the current one",
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


function tabgroupCompleter (context, excludeActiveGroup) {

    const GI = tabGroup.tabView.GroupItems;
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


// TODO: rename this object
var tabGroup = {
    // not sure whether this is useful in pentadactyl (esp. if only a generic
    // object is created...)
    // require: ["config", "tabs"],

    // TODO: rename this field
    TV: window.TabView,

    // TODO: rename this getter (so it fits to the previous field!)
    get tabView () {
        let tv = window.TabView;
        if (!tv)
            return null;
        else if (!tv._window || !tv._window.GroupItems) {
            let waiting = true;
            tv._initFrame (function () { waiting = false; });
            while (waiting)
                dactyl.threadYield (false, true);
        }
        delete this.tabView;
        return this.tabView = tv._window;
    },

    get appTabs () {
        let apps = [];
        for (let tab of config.tabbrowser.tabs) {
            if (tab.pinned)
                apps.push (tab);
            else
                break;
        }
        return apps;
    },

    // TODO: settle for tab group/tabgroup/Tab Group or something else
    // TODO: decipher parameter count
    /**
     * Get a tabgroup object by its name or id.
     *
     * @param {string|number} name The group's id and/or name
     * @param {number} count
     * @return {GroupItem}
     */
    findGroup: function (name, count) {
        // TODO: this function might be more performant if one tries first to
        // extract a number from name (instead of checking its type?); this
        // depends on how it is called most often -- with a number-typed
        // parameter or with a string parameter

        if (!count)
            count = 1;

        // gets assigned a function that tests whether a given tabgroup is the
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
        for (let group of this.tabView.GroupItems.groupItems) {
            if (test (group)) {
                i++;
                if (i == count)
                    return group;
            }
        }
        return null;
    },

    // TODO: disable relative indices (who needs that when switching
    // tabgroups...)
    /**
     * Switch to a group or an orphaned tab.
     *
     * @param {String|Number} spec The group's index, relative to the currently
     * activated group (a number preceded by '+' or '-'), or its absolute index
     * and/or name
     * @param {boolean} wrap Whether relative indices should wrap
     */
    switchTo: function (spec, wrap) {
        let GI = tabGroup.tabView.GroupItems;
        let current = GI.getActiveGroupItem () || GI.getActiveOrphanTab ();
        let groups = GI.groupItems;
        // TODO: understand offset (why is it _added_ below instead of
        // multiplying it?)
        let offset = 1;
        let relative = false;

        // will contain the absolute index of the tabgroup to switch to
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
            let targetGroup = tabGroup.findGroup (spec);
            if (targetGroup)
                index = groups.indexOf (targetGroup);
            else {
                dactyl.echoerr ("No such tab group: " + spec);
                return;
            }
        } else
            return;

        let length = groups.length;
        let apps = tabGroup.appTabs;

        function groupSwitch (index, wrap) {
            // if the index is out of range, wrap (but only if wrap is true)
            if (index > length - 1)
                index = wrap ? index % length : length - 1;
            else if (index < 0)
                index = wrap ? index % length + length : 0;

            // determine the tabgroup and tab to be selected
            let target = groups[index]
            let group = null;
            if (target instanceof tabGroup.tabView.GroupItem) {
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
                if (apps.length === 0)
                    group.newTab ();
                // else, select the first pinned tab
                else {
                    GI.setActiveGroupItem (group);
                    tabGroup.tabView.UI.goToTab (tabs.getTab (0));
                }
            }
            // TODO: no idea why this is case necessary (could it be an
            // inconistency in the browser?)
            else if (relative) {
                dactyl.echoerr ("The strange case has occurred: " + spec);
                groupSwitch (index + offset, true);
            } else {
              dactyl.echoerr ("Cannot switch to tab group: " + spec);
              return;
            }
        }
        groupSwitch (index, wrap);
    },

    /**
     * Create a new tabgroup.
     *
     * @param {string} name The Name of the new tabgroup
     * @param {boolean} shouldSwitch Whether it should be switched to the new
     * tabgroup
     * @param {element} tab A tab that should be moved to the new tabgroup
     * @return {GroupItem} The new tabgroup (an instance of GroupItem)
     */
    createGroup: function (name, shouldSwitch, tab) {
        // TODO: is this stuff really necessary? most probable answer: nope.
        // let pageBounds = tabGroup.tabView.Items.getPageBounds ();
        // pageBounds.inset (20, 20);
        // let box = new tabGroup.tabView.Rect (pageBounds);
        // box.width = 125;
        // box.height = 110;
        // let group = new tabGroup.tabView.GroupItem ([], { bounds: box, title: name });
        let group = new tabGroup.tabView.GroupItem ([], { bounds: undefined, title: name });

        if (tab && !tab.pinned)
            tabGroup.TV.moveTabTo (tab, group.id);

        if (shouldSwitch) {
            // TODO: clean many lets
            let appTabs = tabGroup.appTabs;
            let child = group.getChild (0);
            // if there is a non-pinned tab in the tabgroup, select it
            if (child) {
                tabGroup.tabView.GroupItems.setActiveGroupItem (group);
                tabGroup.tabView.UI.goToTab (child.tab);
            }
            // else, if there are no pinned tabs either, create an empty tab
            else if (appTabs.length == 0)
                // this method automatically switches to the new tab (and thus
                // to the group)
                group.newTab ();
            // else, select the last app tab (if existant)
            else {
                tabGroup.tabView.GroupItems.setActiveGroupItem (group);
                tabGroup.tabView.UI.goToTab (appTabs[appTabs.length - 1]);
            }

        }
        return group;
    },

    // TODO: make things more "strongly typed" (meaning create different methods
    // for the case of group being a group object and group being a string)
    // TODO: use more dactyl.assert?
    /**
     * Move a tab to a tabgroup.
     *
     * @param {element} tab The tab to move
     * @param {GroupItem||string} group The group to move the tab to (either
     * a string that can be used to determine the group using tabGroup.findGroup
     * or a GroupItem)
     * @param {boolean} shouldSwitch Whether to switch to the tab after moving
     * it
     */
    moveTab: function (tab, group, shouldSwitch) {
        dactyl.assert (tab && !tab.pinned, "Cannot move an AppTab");

        let groupItem = (group instanceof tabGroup.tabView.GroupItem) ? group : tabGroup.findGroup (group);
        dactyl.assert (groupItem, "No such group: " + group);

        if (groupItem) {
            tabGroup.TV.moveTabTo (tab, groupItem.id);
            if (shouldSwitch)
                tabGroup.tabView.UI.goToTab (tab);
        }
    },

    // TODO: s/const/let/
    /**
     * Close all tabs in the given (or current) tabgroup.
     *
     * @param {string} groupName The tabgroup to close all tabs in (if
     * undefined, the current tabgroup's tabs are being closed)
     */
    remove: function (groupName) {
        // TODO: rename this variable?
        let GI = tabGroup.tabView.GroupItems;
        let activeGroup = GI.getActiveGroupItem ();
        let group = groupName ? tabGroup.findGroup (groupName) : activeGroup;
        dactyl.assert (group, "No such group: " + groupName);

        if (group === activeGroup) {
            let gb = config.tabbrowser;
            let vTabs = gb.visibleTabs;
            // if there are tabs outside the current tabgroup (they must be in
            // other tabgroups)
            if (vTabs.length < gb.tabs.length)
                // TODO: switch to the _first_ tabgroup
                // switch to the next tabgroup
                tabGroup.switchTo ("+1", true);
            else {
                let appTabs = tabGroup.appTabs;
                // if there are no pinned tabs, create a new blank tab
                if (appTabs.length == 0)
                    gb.loadOnTab (window.BROWSER_NEW_TAB_URL || "about:blank", { inBackground: false, relatedToCurrent: false });
                // else switch to the last pinned tab
                else
                    gb.mTabContainer.selectedIndex = appTabs.length - 1;

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
}


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
