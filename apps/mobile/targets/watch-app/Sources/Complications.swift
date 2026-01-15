/**
 * Watch Complications
 *
 * Provides ClockKit complications for quick workout access
 * and displaying today's stats on the watch face.
 */

import ClockKit
import SwiftUI

/// Complication data source for MuscleMap
class ComplicationController: NSObject, CLKComplicationDataSource {

    // MARK: - Complication Configuration

    func getComplicationDescriptors(handler: @escaping ([CLKComplicationDescriptor]) -> Void) {
        let descriptors = [
            CLKComplicationDescriptor(
                identifier: "musclemapWorkout",
                displayName: "MuscleMap",
                supportedFamilies: [
                    .circularSmall,
                    .modularSmall,
                    .modularLarge,
                    .utilitarianSmall,
                    .utilitarianSmallFlat,
                    .utilitarianLarge,
                    .graphicCorner,
                    .graphicCircular,
                    .graphicRectangular,
                    .graphicExtraLarge
                ]
            )
        ]
        handler(descriptors)
    }

    func handleSharedComplicationDescriptors(_ complicationDescriptors: [CLKComplicationDescriptor]) {
        // Handle shared descriptors if needed
    }

    // MARK: - Timeline Configuration

    func getTimelineEndDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
        // Support timeline entries for the next 24 hours
        handler(Date().addingTimeInterval(24 * 60 * 60))
    }

    func getPrivacyBehavior(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationPrivacyBehavior) -> Void) {
        // Show placeholder when device is locked
        handler(.showOnLockScreen)
    }

    // MARK: - Timeline Population

    func getCurrentTimelineEntry(
        for complication: CLKComplication,
        withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void
    ) {
        let template = makeTemplate(for: complication.family)
        if let template = template {
            handler(CLKComplicationTimelineEntry(date: Date(), complicationTemplate: template))
        } else {
            handler(nil)
        }
    }

    func getTimelineEntries(
        for complication: CLKComplication,
        after date: Date,
        limit: Int,
        withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void
    ) {
        // We update complications in real-time, no need for future entries
        handler(nil)
    }

    // MARK: - Placeholder Templates

    func getLocalizableSampleTemplate(
        for complication: CLKComplication,
        withHandler handler: @escaping (CLKComplicationTemplate?) -> Void
    ) {
        handler(makePlaceholderTemplate(for: complication.family))
    }

    // MARK: - Template Creation

    private func makeTemplate(for family: CLKComplicationFamily) -> CLKComplicationTemplate? {
        let workoutManager = WorkoutManager.shared
        let todayTU = workoutManager.todayTU
        let todayWorkouts = workoutManager.todayWorkouts

        switch family {
        case .circularSmall:
            return CLKComplicationTemplateCircularSmallSimpleImage(
                imageProvider: CLKImageProvider(onePieceImage: UIImage(systemName: "figure.strengthtraining.traditional")!)
            )

        case .modularSmall:
            return CLKComplicationTemplateModularSmallSimpleImage(
                imageProvider: CLKImageProvider(onePieceImage: UIImage(systemName: "figure.strengthtraining.traditional")!)
            )

        case .modularLarge:
            let headerProvider = CLKSimpleTextProvider(text: "MuscleMap")
            headerProvider.tintColor = .blue
            let body1Provider = CLKSimpleTextProvider(text: "\(todayTU) TU")
            let body2Provider = CLKSimpleTextProvider(text: "\(todayWorkouts) workouts")

            return CLKComplicationTemplateModularLargeStandardBody(
                headerTextProvider: headerProvider,
                body1TextProvider: body1Provider,
                body2TextProvider: body2Provider
            )

        case .utilitarianSmall, .utilitarianSmallFlat:
            return CLKComplicationTemplateUtilitarianSmallFlat(
                textProvider: CLKSimpleTextProvider(text: "\(todayTU) TU")
            )

        case .utilitarianLarge:
            return CLKComplicationTemplateUtilitarianLargeFlat(
                textProvider: CLKSimpleTextProvider(text: "MuscleMap: \(todayTU) TU")
            )

        case .graphicCorner:
            let gaugeProvider = CLKSimpleGaugeProvider(
                style: .fill,
                gaugeColor: .blue,
                fillFraction: min(Float(todayTU) / 100.0, 1.0)
            )
            return CLKComplicationTemplateGraphicCornerGaugeText(
                gaugeProvider: gaugeProvider,
                outerTextProvider: CLKSimpleTextProvider(text: "\(todayTU)")
            )

        case .graphicCircular:
            let gaugeProvider = CLKSimpleGaugeProvider(
                style: .fill,
                gaugeColor: .blue,
                fillFraction: min(Float(todayTU) / 100.0, 1.0)
            )
            return CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText(
                gaugeProvider: gaugeProvider,
                bottomTextProvider: CLKSimpleTextProvider(text: "TU"),
                centerTextProvider: CLKSimpleTextProvider(text: "\(todayTU)")
            )

        case .graphicRectangular:
            let headerProvider = CLKSimpleTextProvider(text: "MuscleMap")
            headerProvider.tintColor = .blue
            let body1Provider = CLKSimpleTextProvider(text: "\(todayTU) Training Units")
            let body2Provider = CLKSimpleTextProvider(text: "\(todayWorkouts) Workouts Today")

            return CLKComplicationTemplateGraphicRectangularStandardBody(
                headerTextProvider: headerProvider,
                body1TextProvider: body1Provider,
                body2TextProvider: body2Provider
            )

        case .graphicExtraLarge:
            return CLKComplicationTemplateGraphicExtraLargeCircularStackText(
                line1TextProvider: CLKSimpleTextProvider(text: "\(todayTU)"),
                line2TextProvider: CLKSimpleTextProvider(text: "TU")
            )

        default:
            return nil
        }
    }

    private func makePlaceholderTemplate(for family: CLKComplicationFamily) -> CLKComplicationTemplate? {
        switch family {
        case .circularSmall:
            return CLKComplicationTemplateCircularSmallSimpleImage(
                imageProvider: CLKImageProvider(onePieceImage: UIImage(systemName: "figure.strengthtraining.traditional")!)
            )

        case .modularSmall:
            return CLKComplicationTemplateModularSmallSimpleImage(
                imageProvider: CLKImageProvider(onePieceImage: UIImage(systemName: "figure.strengthtraining.traditional")!)
            )

        case .modularLarge:
            return CLKComplicationTemplateModularLargeStandardBody(
                headerTextProvider: CLKSimpleTextProvider(text: "MuscleMap"),
                body1TextProvider: CLKSimpleTextProvider(text: "-- TU"),
                body2TextProvider: CLKSimpleTextProvider(text: "-- workouts")
            )

        case .utilitarianSmall, .utilitarianSmallFlat:
            return CLKComplicationTemplateUtilitarianSmallFlat(
                textProvider: CLKSimpleTextProvider(text: "-- TU")
            )

        case .utilitarianLarge:
            return CLKComplicationTemplateUtilitarianLargeFlat(
                textProvider: CLKSimpleTextProvider(text: "MuscleMap: -- TU")
            )

        case .graphicCorner:
            return CLKComplicationTemplateGraphicCornerGaugeText(
                gaugeProvider: CLKSimpleGaugeProvider(style: .fill, gaugeColor: .blue, fillFraction: 0.5),
                outerTextProvider: CLKSimpleTextProvider(text: "--")
            )

        case .graphicCircular:
            return CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText(
                gaugeProvider: CLKSimpleGaugeProvider(style: .fill, gaugeColor: .blue, fillFraction: 0.5),
                bottomTextProvider: CLKSimpleTextProvider(text: "TU"),
                centerTextProvider: CLKSimpleTextProvider(text: "--")
            )

        case .graphicRectangular:
            return CLKComplicationTemplateGraphicRectangularStandardBody(
                headerTextProvider: CLKSimpleTextProvider(text: "MuscleMap"),
                body1TextProvider: CLKSimpleTextProvider(text: "-- Training Units"),
                body2TextProvider: CLKSimpleTextProvider(text: "-- Workouts Today")
            )

        case .graphicExtraLarge:
            return CLKComplicationTemplateGraphicExtraLargeCircularStackText(
                line1TextProvider: CLKSimpleTextProvider(text: "--"),
                line2TextProvider: CLKSimpleTextProvider(text: "TU")
            )

        default:
            return nil
        }
    }
}

// MARK: - Complication Refresh

extension ComplicationController {
    /// Refresh all complications with updated data
    static func refreshComplications() {
        let server = CLKComplicationServer.sharedInstance()

        for complication in server.activeComplications ?? [] {
            server.reloadTimeline(for: complication)
        }
    }
}
