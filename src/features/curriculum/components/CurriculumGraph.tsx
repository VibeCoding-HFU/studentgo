import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import type { CurriculumGraph as CurriculumGraphData } from '../types';
import { baseStyles } from '../styles';

type PositionedNode = {
  height: number;
  node: CurriculumGraphData['nodes'][number];
  width: number;
  x: number;
  y: number;
};

function nodeBox(node: CurriculumGraphData['nodes'][number]) {
  if (node.type === 'program') {
    return { height: 70, width: 240 };
  }

  if (node.type === 'specialization') {
    return { height: 56, width: 172 };
  }

  if (node.type === 'semester') {
    return { height: 58, width: 196 };
  }

  if (node.type === 'electiveSlot') {
    return { height: 68, width: 196 };
  }

  if (node.type === 'tag') {
    return { height: 44, width: 160 };
  }

  return { height: 78, width: 196 };
}

function nodeColors(node: CurriculumGraphData['nodes'][number]) {
  if (node.type === 'program') {
    return { fill: '#163F34', stroke: '#163F34', text: '#FFFFFF' };
  }

  if (node.type === 'specialization') {
    return { fill: '#E7F4EF', stroke: '#7DB796', text: '#174231' };
  }

  if (node.type === 'semester') {
    return { fill: '#EEF6F1', stroke: '#B6D0C1', text: '#234639' };
  }

  if (node.type === 'electiveSlot') {
    return { fill: '#FFF6E7', stroke: '#E7BC66', text: '#7A4F08' };
  }

  if (node.type === 'tag') {
    return { fill: '#F3F4F6', stroke: '#D0D5DD', text: '#344054' };
  }

  if (node.area === 'THESIS') {
    return { fill: '#ECFDF3', stroke: '#52B788', text: '#14532D' };
  }

  if (node.area === 'INTERNSHIP') {
    return { fill: '#FEF3F2', stroke: '#F97066', text: '#912018' };
  }

  if (node.area === 'SPECIALIZATION') {
    return { fill: '#EEF4FF', stroke: '#84ADFF', text: '#1D3E80' };
  }

  return { fill: '#FFFFFF', stroke: '#C8D8CF', text: '#18322B' };
}

function edgeColor(type: CurriculumGraphData['edges'][number]['type']) {
  if (type === 'REQUIRES') {
    return '#D92D20';
  }

  if (type === 'BELONGS_TO_SPECIALIZATION') {
    return '#0E9384';
  }

  if (type === 'TAGGED_WITH') {
    return '#667085';
  }

  return '#98A2B3';
}

export function CurriculumGraph({
  graph,
  onSelectModule,
}: {
  graph: CurriculumGraphData;
  onSelectModule: (moduleId: string) => void;
}) {
  const styles = useThemedStyles(baseStyles);
  const [zoom, setZoom] = useState(1);

  const layout = useMemo(() => {
    const semesters = graph.nodes
      .filter((node) => node.type === 'semester')
      .sort((left, right) => (left.number ?? 0) - (right.number ?? 0));
    const specializations = graph.nodes.filter((node) => node.type === 'specialization');
    const modulesBySemester = new Map<number, CurriculumGraphData['nodes']>();
    const slotsBySemester = new Map<number, CurriculumGraphData['nodes']>();
    const tags = graph.nodes.filter((node) => node.type === 'tag');
    const positionedNodes = new Map<string, PositionedNode>();

    for (const semester of semesters) {
      modulesBySemester.set(semester.number ?? 0, []);
      slotsBySemester.set(semester.number ?? 0, []);
    }

    for (const node of graph.nodes) {
      if (node.type === 'module' && typeof node.semesterNumber === 'number') {
        modulesBySemester.set(node.semesterNumber, [...(modulesBySemester.get(node.semesterNumber) ?? []), node]);
      }

      if (node.type === 'electiveSlot' && typeof node.semesterNumber === 'number') {
        slotsBySemester.set(node.semesterNumber, [...(slotsBySemester.get(node.semesterNumber) ?? []), node]);
      }
    }

    const columnWidth = 220;
    const columnGap = 24;
    const leftInset = 34;
    const programNode = graph.nodes.find((node) => node.type === 'program');

    if (programNode) {
      const box = nodeBox(programNode);
      const semestersWidth = Math.max(1, semesters.length) * (columnWidth + columnGap) - columnGap;
      const x = leftInset + Math.max(0, (semestersWidth - box.width) / 2);
      positionedNodes.set(programNode.id, { ...box, node: programNode, x, y: 26 });
    }

    specializations.forEach((node, index) => {
      const box = nodeBox(node);
      positionedNodes.set(node.id, {
        ...box,
        node,
        x: leftInset + index * (box.width + 14),
        y: 122,
      });
    });

    let maxY = 280;

    semesters.forEach((node, index) => {
      const box = nodeBox(node);
      const x = leftInset + index * (columnWidth + columnGap);
      let y = 214;

      positionedNodes.set(node.id, { ...box, node, x, y });
      y += box.height + 18;

      for (const moduleNode of modulesBySemester.get(node.number ?? 0) ?? []) {
        const moduleBox = nodeBox(moduleNode);
        positionedNodes.set(moduleNode.id, { ...moduleBox, node: moduleNode, x, y });
        y += moduleBox.height + 16;
      }

      for (const slotNode of slotsBySemester.get(node.number ?? 0) ?? []) {
        const slotBox = nodeBox(slotNode);
        positionedNodes.set(slotNode.id, { ...slotBox, node: slotNode, x, y });
        y += slotBox.height + 14;
      }

      maxY = Math.max(maxY, y);
    });

    if (tags.length > 0) {
      const x = leftInset + semesters.length * (columnWidth + columnGap) + 42;
      let y = 214;

      for (const tag of tags) {
        const box = nodeBox(tag);
        positionedNodes.set(tag.id, { ...box, node: tag, x, y });
        y += box.height + 12;
      }

      maxY = Math.max(maxY, y);
    }

    const width = leftInset * 2 + Math.max(semesters.length, 1) * (columnWidth + columnGap) + (tags.length > 0 ? 220 : 0);
    const height = maxY + 36;

    return {
      height,
      positionedNodes,
      width,
    };
  }, [graph]);

  function adjustZoom(delta: number) {
    setZoom((current) => Math.max(0.75, Math.min(1.85, Number((current + delta).toFixed(2)))));
  }

  function handleNodePress(node: CurriculumGraphData['nodes'][number]) {
    if (node.type === 'module') {
      onSelectModule(node.id.replace('module:', ''));
    }
  }

  return (
    <View style={styles.graphShell}>
      <View style={styles.graphControls}>
        <Pressable style={styles.graphButton} onPress={() => adjustZoom(-0.15)}>
          <Text style={styles.graphButtonText}>-</Text>
        </Pressable>
        <Pressable style={styles.graphButton} onPress={() => setZoom(1)}>
          <Text style={styles.graphButtonText}>{Math.round(zoom * 100)}%</Text>
        </Pressable>
        <Pressable style={styles.graphButton} onPress={() => adjustZoom(0.15)}>
          <Text style={styles.graphButtonText}>+</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.graphViewport} contentContainerStyle={{ minHeight: 560 }}>
        <ScrollView horizontal>
          <Svg
            height={layout.height * zoom}
            width={layout.width * zoom}
            viewBox={`0 0 ${layout.width} ${layout.height}`}>
            {graph.edges.map((edge) => {
              const fromNode = layout.positionedNodes.get(edge.from);
              const toNode = layout.positionedNodes.get(edge.to);

              if (!fromNode || !toNode) {
                return null;
              }

              const fromX = fromNode.x + fromNode.width / 2;
              const fromY = fromNode.y + fromNode.height / 2;
              const toX = toNode.x + toNode.width / 2;
              const toY = toNode.y + toNode.height / 2;
              const stroke = edgeColor(edge.type);

              if (edge.type === 'REQUIRES') {
                const controlX = (fromX + toX) / 2;
                const controlY = Math.min(fromY, toY) - 36;
                return (
                  <Path
                    d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                    fill="none"
                    key={edge.id}
                    stroke={stroke}
                    strokeWidth={2.5}
                  />
                );
              }

              return (
                <Line
                  key={edge.id}
                  stroke={stroke}
                  strokeDasharray={edge.type === 'TAGGED_WITH' ? '6 6' : undefined}
                  strokeWidth={edge.type === 'BELONGS_TO_SPECIALIZATION' ? 2.5 : 1.8}
                  x1={fromX}
                  x2={toX}
                  y1={fromY}
                  y2={toY}
                />
              );
            })}
            {Array.from(layout.positionedNodes.values()).map(({ node, x, y, width, height }) => {
              const colors = nodeColors(node);
              const interactionProps = Platform.OS === 'web'
                ? { onClick: () => handleNodePress(node) }
                : { onPress: () => handleNodePress(node) };

              return (
                <G
                  key={node.id}
                  {...interactionProps}>
                  <Rect fill={colors.fill} height={height} rx={18} ry={18} stroke={colors.stroke} strokeWidth={1.4} width={width} x={x} y={y} />
                  <SvgText fill={colors.text} fontSize={node.type === 'program' ? 22 : node.type === 'semester' ? 16 : 14} fontWeight="700" x={x + 14} y={y + 24}>
                    {node.label}
                  </SvgText>
                  {node.type === 'module' ? (
                    <>
                      <SvgText fill="#667085" fontSize={11} fontWeight="700" x={x + 14} y={y + 46}>
                        {`${node.credits ?? 0} LP • ${node.area?.toLowerCase() ?? 'modul'}`}
                      </SvgText>
                      <SvgText fill="#667085" fontSize={11} x={x + 14} y={y + 62}>
                        Tippen fuer Details
                      </SvgText>
                    </>
                  ) : null}
                  {node.type === 'electiveSlot' ? (
                    <SvgText fill="#9A6700" fontSize={11} x={x + 14} y={y + 46}>
                      {`${node.credits ?? 0} LP • ${node.kind === 'FREE_CHOICE' ? 'freie Wahl' : 'Fakultaetskatalog'}`}
                    </SvgText>
                  ) : null}
                  {node.type === 'semester' ? (
                    <SvgText fill="#667085" fontSize={11} x={x + 14} y={y + 44}>
                      {`${node.credits ?? 0} LP im Studienplan`}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>
    </View>
  );
}
