import {useMemo, useState} from "react";
import { Button, Card, Col, Divider, Form, Input, Row } from "antd";
import axios from "axios";
import { CopyButton } from "../../components/CopyButton";

export const GetLatestBlockHeight = () => {
    const [latestHeight, setLatestHeight] = useState(null);

    const tryRequest = () => {
        setLatestHeight(null);
        try {
            axios
                .get(`https://api.explorer.provable.com/v1/testnet/latest/height`)
                .then((response) =>
                    setLatestHeight(JSON.stringify(response.data, null, 2)),
                );
        } catch (error) {
            console.error(error);
        }
    };

    const layout = { labelCol: { span: 3 }, wrapperCol: { span: 21 } };

    const latestHeightString = useMemo(() => {
        return latestHeight !== null ? latestHeight.toString() : ""
    }, [latestHeight]);

    return (
        <Card
            title="Get Latest Block Height"
            style={{ width: "100%" }}
        >
            <Row justify="center">
                <Col>
                    <Button
                        type="primary"

                        size="middle"
                        onClick={tryRequest}
                    >
                        Get Latest Block Height
                    </Button>
                </Col>
            </Row>
            {latestHeight !== null ? (
                <Form {...layout}>
                    <Divider />
                    <Form.Item label="Block" colon={false}>
                        <Input
                            size="large"
                            rows={1}
                            placeholder="Block"
                            value={latestHeightString}
                            addonAfter={
                                <CopyButton
                                    data={latestHeightString}
                                />
                            }
                            disabled
                        />
                    </Form.Item>
                </Form>
            ) : null}
        </Card>
    );
};
