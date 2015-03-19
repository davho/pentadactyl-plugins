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


group.commands.add(["tabg[roup]", "tg"],
    "Tabgroup Management",
    function (args) {
        if (args["-add"])
            tabGroup.createGroup (args["-add"], true)

        else if (args["-list"])
            window.alert ("list");

        // else if (args["-pulltab"]) {
            // let activeGroup = tabGroup.tabView.GroupItems.getActiveGroupItem();
            // if (!activeGroup) {
            //     dactyl.echoerr("Cannot pull tab to the current group");
            //     return;
            // }
            // let buffer = args["-pulltab"];
            // window.alert (buffer)
            // if (!buffer)
            //     return;

            // let tabItems = tabs.getTabsFromBuffer(buffer);
            // if (tabItems.length == 0) {
            //     dactyl.echoerr("No matching buffer for: " + buffer);
            //     return;
            // } else if (tabItems.length > 1) {
            //     dactyl.echoerr("More than one match for: " + buffer);
            //     return;
            // }
            // tabGroup.moveTab(tabItems[0], activeGroup, args.bang);
        // }

        else if (args["-pushtab"]) {
            let currentTab = tabs.getTab();
            if (currentTab.pinned) {
                liberator.echoerr("Cannot move an App Tab");
                return;
            }
            let groupName = args["-pushtab"];
            let group = tabGroup.getGroup(groupName);
            if (!group) {
                if (args.bang)
                    group = tabGroup.createGroup(groupName);
                else {
                    liberator.echoerr("No such group: " + groupName.quote() + ". Add \"!\" if you want to create it.");
                    return;
                }
            }
            tabGroup.moveTab(currentTab, group);
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
            //     completer: function (context) completion.buffer(context),
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
        let activeGroup = GI.getActiveGroupItem();
        if (activeGroup)
            groupItems = groupItems.filter(function(group) group.id != activeGroup.id);
    }
    context.title = ["Tab Group"];
    context.anchored = false;
    context.completions = groupItems.map(function(group) {
        let title = group.id + ": " + (group.getTitle() || "(Untitled)");
        let desc = "Tabs: " + group.getChildren().length;

        return [title, desc];
    });
}


var tabGroup = {
    requires: ["config", "tabs"],

    TV: window.TabView,

    get tabView () {
        const TV = window.TabView;
        if (!TV)
            return null;
        if (!TV._window || !TV._window.GroupItems) {
            let waiting = true;
            TV._initFrame(function() { waiting = false; });
            while (waiting)
                dactyl.threadYield(false, true);
        }
        delete this.tabView;
        return this.tabView = TV._window;
    },

    get appTabs () {
        var apps = [];
        for (let tab of config.tabbrowser.tabs) {
            if (tab.pinned)
                apps.push(tab);
            else
                break;
        }
        return apps;
    },

    /**
     * Get a group object by its name or id.
     *
     * @param {string|number} name The group's id and/or name
     * @param {number} count
     * @return {GroupItem}
     */
    getGroup: function getGroup (name, count) {
        let i = 0;
        if (!count)
            count = 1;

        let test;
        if (typeof name == "number")
            test = function (g) g.id == name;
        else {
            name = name.toLowerCase();
            let id;
            let matches = name.match(/^(\d+)(?::(?:\s+(.*))?)?$/);
            if (matches)
                [, id, name] = matches;

            if (id) {
                id = parseInt(id, 10);
                test = function (g) g.id == id;
            }
            else
                test = function (g) g.getTitle().toLowerCase() == name;
        }
        for (let group of this.tabView.GroupItems.groupItems) {
            if (test(group)) {
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
     * @param {Boolean} wrap Whether relative indices should wrap
     */
    switchTo: function (spec, wrap) {
        const GI = tabGroup.tabView.GroupItems;
        let current = GI.getActiveGroupItem() || GI.getActiveOrphanTab();
        let groups = GI.groupItems;
        let offset = 1, relative = false, index;
        // if an absolute index was given
        if (typeof spec === "number")
            index = parseInt(spec, 10);
        // if a relative index was given
        else if (/^[+-]\d+$/.test(spec)) {
            let buf = parseInt(spec, 10);
            index = groups.indexOf(current) + buf;
            offset = buf >= 0 ? 1 : -1;
            relative = true;
        }
        // if something else was given, treat it like 'an index and/or name'
        else if (spec != "") {
            let targetGroup = tabGroup.getGroup(spec);
            if (targetGroup)
                index = groups.indexOf(targetGroup);
            else {
                dactyl.echoerr("No such tab group: " + spec);
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

            // determine the group and tab objects to be selected
            let target = groups[index], group = null;
            if (target instanceof tabGroup.tabView.GroupItem) {
                // the group to be selected
                group = target;
                // the tab to be selected
                target = target.getActiveTab() || target.getChild(0);
            }

            // if a tab was found in the group
            if (target)
                // select it
                gBrowser.mTabContainer.selectedItem = target.tab;
            // if the group doesn't contain any tabs
            else if (group) {
                // create a new tab, if there are no pinned tabs
                if (apps.length === 0)
                    group.newTab();
                // else, select the first pinned tab
                else {
                    GI.setActiveGroupItem(group);
                    tabGroup.tabView.UI.goToTab(tabs.getTab(0));
                }
            }
            else if (relative)
                groupSwitch(index + offset, true);
            else
            {
              dactyl.echoerr("Cannot switch to tab group: " + spec);
              return;
            }
        }
        groupSwitch(index, wrap);
    },

    /**
     * @param {string} name Group Name
     * @param {boolean} shouldSwitch switch to the created group if true
     * @param {element} tab
     * @return {GroupItem} created GroupItem instance
     */
    createGroup: function createGroup (name, shouldSwitch, tab) {
        let pageBounds = tabGroup.tabView.Items.getPageBounds();
        pageBounds.inset(20, 20);
        let box = new tabGroup.tabView.Rect(pageBounds);
        box.width = 125;
        box.height = 110;
        let group = new tabGroup.tabView.GroupItem([], { bounds: box, title: name });

        if (tab && !tab.pinned)
            tabGroup.TV.moveTabTo(tab, group.id);

        if (shouldSwitch) {
            let appTabs = tabGroup.appTabs,
                child = group.getChild(0);
            if (child) {
                tabGroup.tabView.GroupItems.setActiveGroupItem(group);
                tabGroup.tabView.UI.goToTab(child.tab);
            }
            else if (appTabs.length == 0)
                group.newTab();
            else {
                tabGroup.tabView.GroupItems.setActiveGroupItem(group);
                tabGroup.tabView.UI.goToTab(appTabs[appTabs.length - 1]);
            }

        }
        return group;
    },

    /**
     * @param {element} tab element
     * @param {GroupItem||string} group See {@link tabGroup.getGroup}.
     * @param {boolean} create Create a new group named {group}
     *                  if {group} doesn't exist.
     */
    moveTab: function moveTabToGroup (tab, group, shouldSwitch) {
        dactyl.assert(tab && !tab.pinned, "Cannot move an AppTab");

        let groupItem = (group instanceof tabGroup.tabView.GroupItem) ? group : tabGroup.getGroup(group);
        dactyl.assert(groupItem, "No such group: " + group);

        if (groupItem) {
            tabGroup.TV.moveTabTo(tab, groupItem.id);
            if (shouldSwitch)
                tabGroup.tabView.UI.goToTab(tab);
        }
    },

    /**
     * close all tabs in the {groupName}'s or current group
     * @param {string} groupName
     */
    remove: function removeGroup (groupName) {
        const GI = tabGroup.tabView.GroupItems;
        let activeGroup = GI.getActiveGroupItem();
        let group = groupName ? tabGroup.getGroup(groupName) : activeGroup;
        dactyl.assert(group, "No such group: " + groupName);

        if (group === activeGroup) {
            let gb = config.tabbrowser;
            let vTabs = gb.visibleTabs;
            if (vTabs.length < gb.tabs.length)
                tabGroup.switchTo("+1", true);
            else {
                let appTabs = tabGroup.appTabs;
                if (appTabs.length == 0)
                    gb.loadOnTab(window.BROWSER_NEW_TAB_URL || "about:blank", { inBackground: false, relatedToCurrent: false });
                else
                    gb.mTabContainer.selectedIndex = appTabs.length - 1;

                for (let i = vTabs.length - 1, tab; (tab = vTabs[i]) && !tab.pinned; i--)
                    gb.removeTab(tab);

                return;
            }
        }
        group.closeAll();
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
