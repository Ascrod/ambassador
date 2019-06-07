/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function initNetworks()
{
    var networks = new Object();
    var networksFile = new nsLocalFile(client.prefs["profilePath"]);
    networksFile.append("networks.txt");
    var createDefault = !networksFile.exists();

    if (createDefault)
    {
        // Use the default network list.
        networks = networksGetDefaults();
    }
    else
    {
        // Load the user's network list.
        var userNetworkList = networksLoadList();

        for (var i = 0; i < userNetworkList.length; i++)
        {
            var lowerNetName = userNetworkList[i].name.toLowerCase();
            networks[lowerNetName] = userNetworkList[i];
            networks[lowerNetName].name = lowerNetName;
        }
    }

    // Push network list over to client.networkList.
    client.networkList = new Array();
    for (var name in networks)
        client.networkList.push(networks[name]);

    // Sync to client.networks.
    networksSyncFromList();

    // If we created a new file with the defaults, save it.
    if (createDefault)
        networksSaveList();
}

function networksGetDefaults()
{
    var networks = new Object();

    // Set up default network list.
    networks["freenode"] = {
        displayName:  "freenode",
        servers: [{hostname: "chat.freenode.net", port:6697, isSecure: true},
                  {hostname: "chat.freenode.net", port:7000, isSecure: true},
                  // XXX irc.freenode.net is only here until we can link servers
                  // to networks without them being in the network's server list
                  {hostname: "irc.freenode.net", port:6697, isSecure: true},
                  {hostname: "irc.freenode.net", port:7000, isSecure: true}]};
    networks["slashnet"] = {
        displayName:  "slashnet",
        servers: [{hostname: "irc.slashnet.org", port:6697, isSecure: true}]};
    networks["dalnet"] = {
        displayName:  "dalnet",
        servers: [{hostname: "irc.dal.net", port:6697, isSecure: true}]};
    networks["undernet"] = {
        displayName:  "undernet",
        servers: [{hostname: "irc.undernet.org", port:6667}]};
    networks["quakenet"] = {
        displayName:  "quakenet",
        servers: [{hostname: "irc.quakenet.org", port:6667}]};
    networks["ircnet"] = {
        displayName:  "ircnet",
        servers: [{hostname: "open.ircnet.net", port:6667}]};
    networks["moznet"] = {
        displayName:  "moznet",
        servers: [{hostname: "irc.mozilla.org", port:6697, isSecure: true}]};
    networks["efnet"] = {
        displayName:  "efnet",
        servers: [{hostname: "irc.choopa.net", port: 9999, isSecure: true},
                  {hostname: "irc.mzima.net", port: 9999, isSecure: true},
                  {hostname: "efnet.port80.se", port: 9999, isSecure: true},
                  {hostname: "irc.efnet.fr", port: 9999, isSecure: true},
                  {hostname: "irc.efnet.nl", port: 6697, isSecure: true}]};
    networks["hispano"] = {
        displayName:  "hispano",
        servers: [{hostname: "irc.irc-hispano.org", port: 6667}]};
    networks["rizon"] = {
        displayName:  "rizon",
        servers: [{hostname: "irc.rizon.net", port: 6697, isSecure: true}]};
    networks["oftc"] = {
        displayName:  "oftc",
        servers: [{hostname: "irc.oftc.net", port: 6697, isSecure: true}]};
    networks["snoonet"] = {
        displayName:  "snoonet",
        servers: [{hostname: "irc.snoonet.org", port: 6697, isSecure: true}]};

    for (var name in networks)
        networks[name].name = name;

    return networks;
}

function networksSyncToList()
{
    // Stores indexes of networks that should be kept.
    var networkMap = new Object();

    // Copy to and update client.networkList from client.networks.
    for (var name in client.networks)
    {
        var net = client.networks[name];
        /* Skip temporary networks, as they're created to wrap standalone
         * servers only.
         */
        if (net.temporary)
            continue;

        // Find the network in the networkList, if it exists.
        var listNet = null;
        for (var i = 0; i < client.networkList.length; i++)
        {
            if (client.networkList[i].name == name)
            {
                listNet = client.networkList[i];
                networkMap[i] = true;
                break;
            }
        }

        // Network not in list, so construct a shiny new one.
        if (listNet == null)
        {
            var listNet = { name: name, displayName: name };

            client.networkList.push(listNet);
            networkMap[client.networkList.length - 1] = true;
        }

        // Populate server list (no merging here).
        listNet.servers = new Array();
        for (i = 0; i < net.serverList.length; i++)
        {
            var serv = net.serverList[i];

            // Find this server in the list...
            var listServ = null;
            for (var j = 0; j < listNet.servers.length; j++)
            {
                if ((serv.hostname == listNet.servers[j].hostname) &&
                    (serv.port     == listNet.servers[j].port))
                {
                    listServ = listNet.servers[j];
                    break;
                }
            }

            // ...and add a new one if it isn't found.
            if (listServ == null)
            {
                listServ = { hostname: serv.hostname, port: serv.port,
                             isSecure: serv.isSecure };
                listNet.servers.push(listServ);
            }

            listServ.isSecure = serv.isSecure;
        }
    }

    // Remove any no-longer existing networks.
    var index = 0;    // (current pointer into client.networkList)
    var mapIndex = 0; // (original position pointer)
    while (index < client.networkList.length)
    {
        if (mapIndex in networkMap)
        {
            index++;
            mapIndex++;
            continue;
        }

        var listNet = client.networkList[index];
        client.networkList.splice(index, 1);
        mapIndex++;
    }
}

function networksSyncFromList()
{
    var networkMap = new Object();

    // Copy to and update client.networks from client.networkList.
    for (var i = 0; i < client.networkList.length; i++)
    {
        var listNet = client.networkList[i];
        networkMap[listNet.name] = true;

        if ("isDeleted" in listNet)
            // Default networks are no longer hardcoded, so skip this entry.
            continue;

        // Create new network object if necessary.
        var net = null;
        if (!(listNet.name in client.networks))
            client.addNetwork(listNet.name, []);

        // Get network object and make sure server list is empty.
        net = client.networks[listNet.name];
        net.clearServerList();

        // Update server list.
        for (var j = 0; j < listNet.servers.length; j++)
        {
            var listServ = listNet.servers[j];

            // Make sure these exist.
            if (!("isSecure" in listServ))
                listServ.isSecure = false;

            // NOTE: this must match the name given by CIRCServer.
            var servName = listServ.hostname + ":" + listServ.port;

            var serv = null;
            if (!(servName in net.servers))
            {
                net.addServer(listServ.hostname, listServ.port,
                              listServ.isSecure);
            }
            serv = net.servers[servName];

            serv.isSecure = listServ.isSecure;
        }
    }

    // Remove network objects that aren't in networkList.
    for (var name in client.networks)
    {
        // Skip temporary networks, as they don't matter.
        if (client.networks[name].temporary)
            continue;
        if (!(name in networkMap))
            client.removeNetwork(name);
    }
}

function networksLoadList()
{
    var userNetworkList = new Array();

    var networksFile = new nsLocalFile(client.prefs["profilePath"]);
    networksFile.append("networks.txt");
    if (networksFile.exists())
    {
        var networksLoader = new TextSerializer(networksFile);
        if (networksLoader.open("<"))
        {
            var item = networksLoader.deserialize();
            if (isinstance(item, Array))
                userNetworkList = item;
            else
                dd("Malformed networks file!");
            networksLoader.close();
        }
    }

    return userNetworkList;
}

function networksSaveList()
{
    var networksFile = new nsLocalFile(client.prefs["profilePath"]);
    networksFile.append("networks.txt");
    var networksLoader = new TextSerializer(networksFile);
    if (networksLoader.open(">"))
    {
        networksLoader.serialize(client.networkList);
        networksLoader.close();
    }
}
