// The code starts here.

d3.queue()
    .defer(d3.json, "https://raw.githubusercontent.com/shiwangi27/gundeath-vis.github.io/master/data/us-states.json")
    .defer(d3.json, "https://raw.githubusercontent.com/shiwangi27/gundeath-vis.github.io/master/data/gundeaths.json")
    .await(ready);

const width = window.innerWidth,
    height = window.innerHeight;

let svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

// The definition of projection
let projection, path;


// The ready function is called when our data files have finished loading.
// In this instance it takes 3 arguments:
// error -- which if will throw and error if there are problems with our data
// data -- which corresponds to the scores.json file
// map -- which contains the GeoJson mapping of the world's countries

function ready(error, map, gundeath) {

    if (error) throw error;
    // This is how to make a Map!
    let [stateCounts, cityCounts] = TestCenterLocations(map, gundeath);
    let startingGender = d3.select('input[name="gender"]:checked').node().value;

    mapGunDeaths(stateCounts, cityCounts, startingGender, 60);

    d3.selectAll('input[name="gender"]')
        .on('change', e => {
            let value = d3.select('input[name="gender"]:checked').node().value;
            update(value, cityCounts)
        })

    //mapGunDeaths(stateCounts, cityCounts, "female", 40);
    //mapGunDeaths(stateCounts, cityCounts, "total", 80);

}

// Prepare Circle legend with title.
function makeLegend(cityCounts, key) {
    d3.selectAll("g.legendSize").remove()
    d3.select("text.LegendTitle").remove()

    //let scale = makeScale(key, cityCounts);

    let scale = d3.scaleLinear()
        .domain(d3.extent(cityCounts.map(d => d[key])))
        .range([1, 12])

    let g = svg.append("g")
    g.append("text")
        .attr("class", "LegendTitle")
        .text("Gun Death Freqency")
        .attr("transform","translate(" + [1.55*height , 0.43*width]   + ")" )

    // circle legend
    g.append("g")
        .attr("class", "legendSize")
        .attr("transform", "translate(" + [1.53*height , 0.45*width]   + ")")
        .call(
            d3.legendSize()
                .scale(scale)
                .shape('circle')
                .shapePadding(23)
                .labelOffset(20)
                .orient('horizontal')
        );

}

// Prep the tooltip bits, initial display is hidden
function makeToolTip(w, h) {
    w = w || 30;
    h = h || 20;

    let tooltip = svg.insert("g", "g.female-deaths")
        .attr("class", "tooltip")
        .style("display", "none");

    tooltip.append("rect")
        .attr("width", 320)
        .attr("height", 30)
        .attr("fill", "#fff")
        .style("opacity", 0.8)
        .style("stroke", "#BEBEBE")

    tooltip.append("text")
        .attr("x", +150)
        .attr("dy", "1.2em")
        .style("text-anchor", "middle")
        .style("text-padding", "5px")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")

    return tooltip;
}

// This function maps all the test center locations on the US State map.
function TestCenterLocations(usmap, gundeath) {

    // To convert TopoJSON to GeoJSON data back :

    let subunits = topojson.feature(usmap, usmap.objects.states);
    neighbors = topojson.neighbors(usmap.objects.states.geometries);

    projection = d3.geoAlbersUsa().fitSize([width, height], topojson.feature(usmap, usmap.objects.states))
    path = d3.geoPath().projection(projection);


    svg.append("g").append("path")
        .datum(subunits)
        .attr("class", "states")
        .attr("d", path)

    console.log("path", subunits.features[1].properties.postal)

    svg.append("g").insert("path")
        .datum(topojson.mesh(usmap, usmap.objects.states, function(a, b) {
            return a !== b;
        }))
        .attr("class", "boundary")
        .attr("d", path);

    // Map Gundeath locations

    let stateGender = d3.nest()
        .key(d => d.state)
        .key(d => d.gender)
        .entries(gundeath)

    console.log("State & Gender", stateGender)

    let cityGender = d3.nest()
        .key(d => d.city)
        .key(d => d.gender)
        .entries(gundeath)

    cityGender.forEach(city => {
        city.total = 0;
        city.male = 0;
        city.female = 0;
        city.unknown = 0;
        city.lat = 0;
        city.lng = 0;

        // gender is the key we use to get Total, Female, Male and Unknown count
        city.values.forEach(gender => {
            city.total += gender.values.length
            city.male += gender.key === "M" ? gender.values.length : 0;
            city.female += gender.key === "F" ? gender.values.length : 0;
            city.unknown += gender.key === "" ? gender.values.length : 0;
            city.lat = gender.values[0].lat;
            city.lng = gender.values[0].lng;
        })

        //console.log("City, F, M, Lat, Lng : ", city.key, city.female, city.male, city.lat, city.lng)

    })

    console.log("City & Gender", cityGender);

    stateGender.forEach(state => {
        state.total = 0;
        state.male = 0;
        state.female = 0;
        state.unknown = 0;

        // gender is the key we use to get Total, Female, Male and Unknown count
        state.values.forEach(gender => {
            state.total += gender.values.length
            state.male += gender.key === "M" ? gender.values.length : 0;
            state.female += gender.key === "F" ? gender.values.length : 0;
            state.unknown += gender.key === "" ? gender.values.length : 0;
        })

        //console.log("Female", state.female)
    })

    return [stateGender, cityGender];
}


function makeScale(gender, cityGender) {
    let maxRange = 0

    switch(gender){
        case 'male': maxRange = 60; break;
        case 'female': maxRange = 40; break;
        case 'total': maxRange = 80; break;
        default: maxRange = 10; break;
    }
    console.log('maxRange is', maxRange);

    let scale = d3.scaleLinear()
        .domain(d3.extent(cityGender.map(d => d[gender])))
        .range([1, maxRange])

    return scale
}



function update(gender, cityGender) {

    let scale = makeScale(gender, cityGender)
    d3.selectAll('g.death-counts circle')
        .attr("r", d => {
            let rVal = scale(d[gender])
            return rVal ? rVal : 0
        })
        // .attr("transform", d => "translate(" + projection([d.lng, d.lat]) + ")")
        .style("fill", "#e44")
        .style("fill-opacity", 0.7)


    makeLegend(cityGender, gender)

}

// Mapping all the Gun Death Counts!
function mapGunDeaths(stateGender, cityGender, gender) {

    let scale = makeScale(gender, cityGender)

    svg.append("text")
        .attr("class", "SlateTitle")
        .text("Slate Gun Death Visualization")
        .attr("transform", "translate(" + [height / 2 + 200, width / 40] + ")")


        //console.log(cityCounts[0].lat, cityCounts[0].lng)

    // This plots the Counts on the map and displays details on hover.
    svg.append("g")
        .attr("class", "death-counts")
        .selectAll("circle")
        .data(cityGender)
        .enter().append("circle")
        .attr("r", d => {
            let rVal = scale(d[gender])
            return (rVal === 'NaN') ? 0 : rVal
        })
        .attr("transform", d => "translate(" + projection([d.lng, d.lat]) + ")")
        .style("fill", "#e44")
        .style("fill-opacity", 0.7)
        .on("mouseover", function(d) {
            d3.select(this)//.attr('r', d => scale(d[gender]))
                .style("stroke", "#fff")
            ttipCity.style("display", 'block');
        })
        .on("mouseout", function(d) {
            ttipCity.style("display", "none");
            d3.select(this)//.attr('r', d => scale(d[gender]))
                .style("fill-opacity", 0.7)
                .style("stroke", "None")

        })
        .on("mousemove", function(d) {
            // var xPosition = d3.mouse(this)[0];
            // var yPosition = d3.mouse(this)[1];
            let [x,y] = projection([d.lng, d.lat])
            console.log("x,y", x,y);
            //console.log('moving the D', xPosition, yPosition, projection( [d.lng , d.lat] ))   ///projection([d.lng - 9, d.lat - 1])
            ttipCity.attr("transform", "translate(" + (x-9)+ "," + (y-1) + ")")
            d3.select(this)//.attr('r', d => scale(d[gender]) + 10)
                .style("fill-opacity", 0.7)

            ttipCity.select("text").html("City : " + d["key"] + "," +
                "  Female Deaths : " + d["female"] + "," +
                "  Male Deaths : " + d["male"]);

        });

    makeLegend(cityGender, gender)

    let ttipCity = makeToolTip()
    ttipCity.raise()

}
