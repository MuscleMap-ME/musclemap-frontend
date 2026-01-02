import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/auth';

interface Milestone {
  id: string;
  name: string;
  description: string;
  category: string;
  target: number;
  current: number;
  achieved: boolean;
  achievedAt?: string;
}

interface JourneyData {
  totalWorkouts: number;
  totalTU: number;
  totalReps: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  milestones: Milestone[];
}

const { width } = Dimensions.get('window');

export default function JourneyScreen() {
  const { token } = useAuthStore();
  const [data, setData] = useState<JourneyData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchJourneyData = useCallback(async () => {
    if (!token) return;

    try {
      const [progressRes, milestonesRes] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/progress/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/journey/milestones`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const progress = progressRes.ok ? await progressRes.json() : {};
      const milestones = milestonesRes.ok ? await milestonesRes.json() : { milestones: [] };

      setData({
        totalWorkouts: progress.totalWorkouts || 0,
        totalTU: progress.totalTU || 0,
        totalReps: progress.totalReps || 0,
        totalHours: progress.totalHours || 0,
        currentStreak: progress.currentStreak || 0,
        longestStreak: progress.longestStreak || 0,
        milestones: milestones.milestones || [],
      });
    } catch (error) {
      console.error('Failed to fetch journey data:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchJourneyData();
  }, [fetchJourneyData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchJourneyData();
    setIsRefreshing(false);
  };

  const achievedMilestones = data?.milestones.filter((m) => m.achieved) || [];
  const inProgressMilestones = data?.milestones.filter((m) => !m.achieved) || [];

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.totalWorkouts ?? '—'}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.totalTU ?? '—'}</Text>
              <Text style={styles.statLabel}>Training Units</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.currentStreak ?? '—'}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.longestStreak ?? '—'}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>
        </View>

        {inProgressMilestones.length > 0 && (
          <View style={styles.milestonesSection}>
            <Text style={styles.sectionTitle}>In Progress</Text>
            {inProgressMilestones.slice(0, 3).map((milestone) => (
              <View key={milestone.id} style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneName}>{milestone.name}</Text>
                  <Text style={styles.milestoneProgress}>
                    {milestone.current} / {milestone.target}
                  </Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  {milestone.description}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(
                          (milestone.current / milestone.target) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {achievedMilestones.length > 0 && (
          <View style={styles.milestonesSection}>
            <Text style={styles.sectionTitle}>
              Achieved ({achievedMilestones.length})
            </Text>
            {achievedMilestones.map((milestone) => (
              <View
                key={milestone.id}
                style={[styles.milestoneCard, styles.achievedCard]}
              >
                <View style={styles.milestoneHeader}>
                  <View style={styles.achievedBadge}>
                    <Text style={styles.achievedIcon}>✓</Text>
                  </View>
                  <Text style={[styles.milestoneName, styles.achievedName]}>
                    {milestone.name}
                  </Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  {milestone.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!data && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading your journey...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
  },
  milestonesSection: {
    marginBottom: 24,
  },
  milestoneCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  achievedCard: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  achievedName: {
    color: '#22c55e',
  },
  milestoneProgress: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  achievedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  achievedIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#888',
  },
});
