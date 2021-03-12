select('#points-g-' + index_radviz).selectAll("circle.data_point-" + index_radviz)
   .data(data.entries, (d, i) => i)    
   .join(
  enter => enter.append("circle")
      ,
  update => update
      .call(update => update
          .transition()
          .duration(1000)
          .style("fill", function(d) {
              if (quality) return scale_color(d.errorE);
              else if (attribute_color == null) return '#1f78b4';
              else {
                  data.attributes;
                  return scale_classification(d.attributes[attribute_color]);
              }
          })
          .style("stroke-width", (d) => {
              if (d.selected) {
                  return 0.5;
              } else {
                  return 0.2;
              }
          })
          .attr("cx", (d) => { return scale_x2(d.x2); })
          .attr("cy", (d) => { return scale_x1(d.x1); }),
      ),
  exit => exit
      .call(exit => exit
          .transition()
          .duration(650)
          .remove()
      )
);