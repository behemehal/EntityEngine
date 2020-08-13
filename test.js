var entityEngine = require("./index")
var full = new Date().getTime();
entityEngine.parse("test ${sys.any}", "tr-TR").then(async (parsed) => {
    var ParsedIn = new Date().getTime() - full
    var resolv = new Date().getTime();
    var resolver = new entityEngine.resolver(parsed, 'tr-TR');
    resolver.com.on('resolveEntity', (payload, reply) => {
        if (systemEntities[payload.entity]) {
            systemEntities[payload.entity](payload.phase)
                .then((val) => {
                    reply({
                        get: true,
                        val: val
                    });
                })
                .catch(() => {
                    reply({
                        get: false,
                        val: null,
                    });
                });
        } else {
            console.log('entity not found', payload.entity);
        }

    });
    var resolved = await resolver.resolve("test test");
    var ResolvedIn =  new Date().getTime() - resolv
    var total = new Date().getTime() - full
    console.table({ParsedIn,ResolvedIn, total})
    console.log(resolved)
})